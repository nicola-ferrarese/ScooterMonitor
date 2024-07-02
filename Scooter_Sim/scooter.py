import asyncio
import json
import math
import os
import signal
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

import networkx as nx
import osmnx as ox
import random
import sys

from asyncio import Queue
from confluent_kafka import Producer, Consumer, KafkaException
from confluent_kafka.serialization import StringSerializer


class Route:
    def __init__(self, start_node, end_node, env_map):
        self.start_node = start_node
        self.end_node = end_node
        self.route = nx.shortest_path(env_map, start_node, end_node, weight='bellman_ford')
        self.total_distance = nx.shortest_path_length(env_map, start_node, end_node, weight='length')
        self.remaining_distance = self.total_distance
        self.env_map = env_map

    def __str__(self):
        return f"Route from {self.start_node} to {self.end_node} with a total distance of {self.total_distance} meters."

    def get_remaining_distance(self):
        return round(self.remaining_distance, 0)

    def make_step(self):
        if len(self.route) > 1:
            self.route.pop(0)
            self.remaining_distance = nx.shortest_path_length(self.env_map, self.route[0], self.end_node,
                                                              weight='length')
            return self.route[0]
        else:
            return None


def run_consumer(scooter, loop, topic_commands):
    kafka_config = {'bootstrap.servers': 'kafka:9092', 'group.id': f"scooters_consumers{random.randint(1, 1000)}", }

    consumer = Consumer(kafka_config)
    consumer.subscribe([topic_commands])
    print("->Consumer started.")
    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None:
                if stop_event.is_set() is True:
                    print("Stop event is set.")
                    break
                continue
            if msg.error():
                print(f"Consumer error: {msg.error()}")
                try:
                    if msg.error().code() == KafkaException._PARTITION_EOF:
                        # End of partition event
                        continue
                    else:
                        raise KafkaException(msg.error())
                except KafkaException as e:
                    print(f"KafkaException: {e}")
                    pass
            if stop_event.is_set() is True:
                print("Stop event is set.")
                break
            else:
                message = msg.value().decode('utf-8')
                message = json.loads(message)
                if "id" in message.keys() and message['id'] == scooter.id:
                    if "command" in message.keys() and message["command"] is not None:
                        print(f"Received command: {message}")
                        data = { "command" : message['command'], "tripId": message['tripId'] if 'tripId' in message.keys() else None}
                        asyncio.run_coroutine_threadsafe(scooter.get_command_queue().put(data), loop)
        print(f"[{scooter.get_id()}] Consumer stopped.")
    except KeyboardInterrupt:
        print("Keyboard interrupt in consumer.")


class Scooter:
    def __init__(self, id, producer, topics, graph, command_queue, loop):
        self.id = id
        self.producer = producer
        self.topic_commands = topics['commands']
        self.topic_position = topics['positions']
        self.topic_updates = topics['updates']
        self.graph = graph
        self.route = None
        self.status = 'available'  # Possible states: idle, navigating, stopped
        self.remaining_distance = 0
        self.command_queue: Queue = command_queue
        self.loop = loop
        self.current_node = choose_random_node(graph)
        self.trip_id = None

    def get_command_queue(self):
        return self.command_queue

    def get_id(self):
        return self.id

    def run_consumer_in_thread(self, loop):
        print("Starting consumer thread.")
        thread = threading.Thread(target=run_consumer, args=(self, loop, self.topic_commands))
        thread.start()
        print("Consumer thread started.")

    import asyncio

    async def process_commands(self):
        while True:
            # Create a task for getting a command from the queue
            command_task = asyncio.create_task(self.command_queue.get())

            # Create a task that waits for the stop event to be set
            stop_task = asyncio.create_task(self.wait_for_stop())

            # Wait for either the command to be received or the stop event to be set
            done, pending = await asyncio.wait(
                {command_task, stop_task},
                return_when=asyncio.FIRST_COMPLETED)

            # If the stop task is done, break the loop and terminate
            if stop_task in done:
                print("Stop event set. Terminating process_commands loop.")
                self.producer.flush()
                break

            # Otherwise, process the command
            if command_task in done:
                payload = command_task.result()  # Get the result of the command task
                print(f"Scooter {self.id} received command: {payload}")
                command = payload['command']

                # Example command processing logic
                if command == 'start' and self.status == 'available' and stop_event.is_set() is False:
                    print(f"[{self.id}] -> start command in queue. Starting navigation.")
                    self.trip_id = payload['tripId']
                    start_node = choose_random_node(self.graph) if self.current_node is None else self.current_node
                    asyncio.run_coroutine_threadsafe(self.start_navigation(start_node,
                                                                           choose_random_node(self.graph)), self.loop)
                    print(f"[{self.id}] -> start navigation started.")
                elif command == 'stop' or stop_event.is_set() is True:
                    print(f"[{self.id}] -> stop command in queue. Stopping navigation.")
                    asyncio.run_coroutine_threadsafe(self.stop_navigation(), self.loop)

            # Cancel any pending tasks
            for task in pending:
                task.cancel()

    async def wait_for_stop(self):
        #logic to wait for the stop event
        await stop_event.wait()
        return 'stop'

    # Example stop_event, replace with your actual event handling
    stop_event = asyncio.Event()

    def add_to_queue(self, command):
        self.command_queue.put_nowait(command)

    def json_serializer(self, data):
        """Converts data to a JSON string and encodes it to bytes."""
        return json.dumps(data).encode('utf-8')

    def send_coordinates(self, x=None, y=None, start: bool = False, end: bool = False):
        if self.current_node is not None:
            if x is None and y is None:
                x, y = self.graph.nodes[self.current_node]['x'], self.graph.nodes[self.current_node]['y']
            data = {
                "id": self.id,
                #"status": self.status,
                #"node_id": self.current_node,
                "lon": x, # l
                "lat": y, #
                #"remaining_distance": self.remaining_distance
            }
            if start:
                self.send_update(event='start')
            if end:
                self.send_update(event='end')
            serialized_data = self.json_serializer(data)
            print(f"[{self.id}] -> Sending coordinates: {data}")
            self.producer.produce(self.topic_position, value=serialized_data)


    def send_update(self, distance: float = None, event: str = None):
        data = {
            "id": self.id,
            "event": event if event is not None else "update",
            "distance": distance if distance is not None else 0,
            "tripId": self.trip_id if self.trip_id is not None else "",
            "timestamp": int(time.time() * 1000),  # Convert to milliseconds
            'start': {
                "lon": self.graph.nodes[self.route[0]]['x'],
                "lat": self.graph.nodes[self.route[0]]['y']
            },
            'end': {
                "lon": self.graph.nodes[self.route[1]]['x'] if len(self.route) > 1 else self.graph.nodes[self.end_node]['x'],
                "lat": self.graph.nodes[self.route[1]]['y'] if len(self.route) > 1 else self.graph.nodes[self.end_node]['y']
            }
        }
        serialized_data = self.json_serializer(data)
        print(f"[{self.id}] -> Sending update: {data}")
        self.producer.produce(self.topic_updates, value=serialized_data)
        # self.producer.flush()

    async def start_navigation(self, start_node, end_node):
        self.status = 'navigating'
        #self.trip_id = f"{self.id}_{uuid.uuid4()}"
        self.current_node = start_node
        self.end_node = end_node
        self.route = nx.shortest_path(self.graph, start_node, end_node, weight='length')
        self.remaining_distance = nx.shortest_path_length(self.graph, start_node, end_node, weight='length')
        self.send_coordinates(start=True)  # Send initial coordinates

        print(f"[{self.id}] -> navigate start navigation.")
        await asyncio.create_task(self.navigate())
        print(f"[{self.id}] -> navigate closed stopped navigation.")
        self.send_update(event='end')
    async def navigate(self):
        while self.status == 'navigating':
            print(f"[{self.id}] -> navigating.")
            if stop_event.is_set() is False:
                await self.make_step()
            else:
                await self.command_queue.put('stop')
                break

    async def stop_navigation(self):
        print(f"[{self.id}] -> stop navigation.")
        #self.send_update(event='end')
        self.trip_id = None
        self.status = 'available'
        #self.send_coordinates(end=True)  # Send final coordinates

    async def make_step(self):
        SPEED = 25  # Speed in km/h
        S = 3 # Time interval in seconds
        if self.status == 'navigating' and self.route:
            self.current_node = self.route.pop(0)
            positions, distance = self.get_positions(self.graph.nodes[self.current_node]['x'],
                                           self.graph.nodes[self.current_node]['y'],
                                           self.graph.nodes[self.route[0]]['x'],
                                           self.graph.nodes[self.route[0]]['y'],
                                           SPEED, S)

            print(f"[{self.id}] -> make_step: {positions}")

            for position in positions:
                if self.status != 'navigating':
                    break
                print(f"[{self.id}] -> make_step: {position}")
                #if len(positions) > 3:
                self.remaining_distance = nx.shortest_path_length(self.graph, self.current_node, self.end_node,
                                                                  weight='length')

                if stop_event.is_set() is False:
                    self.send_coordinates(x=position[0], y=position[1])
                    await asyncio.sleep(S)
                else:
                    await self.stop_navigation()
                    break

                if position == positions[-1]:
                    self.send_update(distance=distance)

            print(len(self.route))
            if len(self.route) == 1:
                await self.stop_navigation()
            #if len(self.route) > 0:
            #   self.current_node = self.route[0]
            #   self.remaining_distance = nx.shortest_path_length(self.graph, self.current_node, self.end_node,
            #                                                    weight='length')
            #  self.send_coordinates()
            #else:
            #   await  self.stop_navigation()
        else:
            print(f"[{self.id}] -> make_step called while not navigating.")

    def calculate_distance(self, x1, y1, x2, y2):
        return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

    def haversine(self, lat1, lon1, lat2, lon2):
        R = 6371000  # Earth's radius in meters
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    def get_positions(self, x1, y1, x2, y2, set_speed, S):
        '''
        :param x1:
        :param y1:
        :param x2:
        :param y2:
        :param set_speed: in km/h
        :param S: delay between points in seconds
        :return: positions, distance
        '''
        set_speed = set_speed / 3.6  # Convert speed from km/h to m/s
        # Calculate total distance
        distance = self.haversine(x1, y1, x2, y2)
        print(f"Distance: {distance}")

        # Calculate total travel time in seconds at the given speed

        total_time = distance / set_speed

        # Calculate the number of points (one point every S seconds)
        num_points = int(math.ceil(total_time / S))

        # List to store points
        points = [(x1, y1)]

        # Calculate each point's coordinates based on time increments
        for i in range(1, num_points):
            t = i * S  # time elapsed until this point
            # Calculate the proportion of the total distance covered by time t
            if t < total_time:
                proportion = (set_speed * t) / distance
            else:
                proportion = 1  # At or beyond the total travel time, the car is at the end point
            xi = x1 + proportion * (x2 - x1)
            yi = y1 + proportion * (y2 - y1)
            points.append((xi, yi))

        if points[-1] != (x2, y2):  # Ensure the final point is exactly the endpoint if not already added
            points.append((x2, y2))
        for i in range(len(points)):
            points[i] = (round(points[i][0], 7), round(points[i][1], 7))
        return points, distance


async def load_graph(file_path):
    return ox.load_graphml(file_path)


def save_graph(graph, file_path):
    ox.save_graphml(graph, file_path)


# Function to choose a random node from the graph
def choose_random_node(graph):
    nodes = list(graph.nodes)
    return random.choice(nodes)


# Custom serializer function
def json_serializer(data):
    """Converts data to a JSON string and encodes it to bytes."""
    return json.dumps(data).encode('utf-8')


async def main(stop_event, graph_file_path="cesena.graphml"):
    print("Enter Main.")
    loop = asyncio.get_event_loop()
    producer = Producer({'bootstrap.servers': 'kafka:9092'})
    # Command queue for communicating with scooter instances
    command_queue = Queue()
    graph = await load_graph(graph_file_path)
    print("Scooter start init.")
    ids = ['1_1', '1_2', '1_3', '1_4', '1_5', '1_6', '1_7', '1_8', '1_9', '1_10']
    scooters = []
    topics= {
        'commands': 'scooter_commands',
        'positions': 'scooter_positions',
        'updates': 'scooter_updates'
    }
    for id in ids:
        scooters.append(Scooter(id=id, producer=producer, topics = topics, graph=graph, command_queue=Queue(),
                                loop=asyncio.get_running_loop()))



    print("Scooter init done.")
    # Start listening for commands in each scooter
    for scooter in scooters:
        scooter.run_consumer_in_thread(loop=asyncio.get_running_loop())

    print("Scooter started listening.")
    # Process commands in each scooter
    tasks = [asyncio.create_task(scooter.process_commands()) for scooter in scooters]
    loop.add_signal_handler(signal.SIGINT, signal_handler, loop, stop_event, tasks)

    await asyncio.sleep(1)  # Simulate some delay
    print("HAndler set, ready to start")

    # Wait for all tasks to complete (in this case, they should complete after receiving the 'stop' command)
    await asyncio.gather(*tasks)


if __name__ == '__main__':

    # asyncio.run(main())
    async def graceful_shutdown(loop, stop_event, tasks):
        print("Graceful shutdown initiated.")
        stop_event.set()  # Signal all tasks to terminate
        await asyncio.gather(*tasks)  # Wait for all tasks to complete
        loop.stop()  # Stop the event loop
        print("All tasks completed, shutting down.")


    def signal_handler(loop, stop_event, tasks):
        print("Signal received, initiating graceful shutdown.")
        asyncio.ensure_future(graceful_shutdown(loop, stop_event, tasks), loop=loop)


    loop = asyncio.get_event_loop()
    stop_event = asyncio.Event()

    loop.create_task(main(stop_event))

    try:
        print("Starting the event loop.")
        loop.run_forever()
    finally:
        loop.run_until_complete(loop.shutdown_asyncgens())  # Close asynchronous generators
        loop.close()
        print("Event loop closed.")
