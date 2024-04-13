import asyncio
import json
import os
import signal
import threading
import time
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

def run_consumer(scooter, loop):
    kafka_config = {'bootstrap.servers': 'localhost:9092', 'group.id': f"scooters_consumers{random.randint(1, 1000)}", }
    consumer = Consumer(kafka_config)
    consumer.subscribe(['scooter_commands'])
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
                if msg.error().code() == KafkaException._PARTITION_EOF:
                    # End of partition event
                    continue
                else:
                    raise KafkaException(msg.error())
            if stop_event.is_set() is True:
                print("Stop event is set.")
                break
            else:
                message = msg.value().decode('utf-8')
                message = json.loads(message)
                if "id" in message.keys() and message['id'] == scooter.id:
                    if "command" in message.keys() and message["command"] is not None:
                        print(f"Received command: {message['command']}")
                        asyncio.run_coroutine_threadsafe(scooter.get_command_queue().put(message['command']), loop)
        print(f"[{scooter.get_id()}] Consumer stopped.")
    except KeyboardInterrupt:
        print("Keyboard interrupt in consumer.")


class Scooter:
    def __init__(self, id, producer, topic, graph, command_queue, loop):
        self.id = id
        self.producer = producer
        self.topic = topic
        self.graph = graph
        self.route = None
        self.status = 'idle'  # Possible states: idle, navigating, stopped
        self.remaining_distance = 0
        self.command_queue: Queue = command_queue
        self.loop = loop

    def get_command_queue(self):
        return self.command_queue

    def get_id(self):
        return self.id

    def run_consumer_in_thread(self, loop):
        print("Starting consumer thread.")
        thread = threading.Thread(target=run_consumer, args=(self, loop))
        thread.start()
        print("Consumer thread started.")

    async def process_commands___q(self):
        while True:
            print("-> Scooter process commands.")
            command = await self.command_queue.get()
            # Process command here...
            print(f"Scooter {self.id} received command: {command}")
            # Example command processing logic
            if command == 'start' and self.status == 'idle' and stop_event.is_set() is False:
                print(f"[{self.id}] -> start command in queue. Starting navigation.")
                # For simplicity, hardcoded start and end nodes. In practice, these would be dynamic.
                asyncio.run_coroutine_threadsafe(self.start_navigation(choose_random_node(self.graph),
                                                                       choose_random_node(self.graph)), self.loop)
                print(f"[{self.id}] -> start navigation started.")
            elif command == 'stop' or stop_event.is_set() is True:
                print(f"[{self.id}] -> stop command in queue. Stopping navigation.")
                asyncio.run_coroutine_threadsafe(self.stop_navigation(), self.loop)

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
                break

            # Otherwise, process the command
            if command_task in done:
                command = command_task.result()  # Get the result of the command task
                print(f"Scooter {self.id} received command: {command}")
                # Example command processing logic
                if command == 'start' and self.status == 'idle' and stop_event.is_set() is False:
                    print(f"[{self.id}] -> start command in queue. Starting navigation.")
                    # For simplicity, hardcoded start and end nodes. In practice, these would be dynamic.
                    asyncio.run_coroutine_threadsafe(self.start_navigation(choose_random_node(self.graph),
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

    def send_coordinates(self):
        if self.current_node is not None:
            x, y = self.graph.nodes[self.current_node]['x'], self.graph.nodes[self.current_node]['y']
            data = {
                "id": self.id,
                "status": self.status,
                "node_id": self.current_node,
                "x": x,
                "y": y,
                "remaining_distance": self.remaining_distance
            }
            serialized_data = self.json_serializer(data)
            self.producer.produce(self.topic, value=serialized_data)
            # self.producer.flush()

    async def start_navigation(self, start_node, end_node):
        self.status = 'navigating'
        self.current_node = start_node
        self.end_node = end_node
        self.route = nx.shortest_path(self.graph, start_node, end_node, weight='length')
        self.remaining_distance = nx.shortest_path_length(self.graph, start_node, end_node, weight='length')
        self.send_coordinates()  # Send initial coordinates

        print(f"[{self.id}] -> navigate start navigation.")
        await asyncio.create_task(self.navigate())
        print(f"[{self.id}] -> navigate closed stopped navigation.")

    async def navigate(self):
        while self.status == 'navigating':
            print(f"[{self.id}] -> navigating.")
            await asyncio.sleep(1)
            if stop_event.is_set() is False:
                await self.make_step()
            else:
                await self.command_queue.put('stop')
                break

    async def stop_navigation(self):
        print(f"[{self.id}] -> stop navigation.")
        self.status = 'idle'
        self.send_coordinates()  # Send final coordinates

    async def make_step(self):
        if self.status == 'navigating' and self.route:
            # Assume the first node in the route is the current location, so pop it
            self.route.pop(0)
            if len(self.route) > 0:
                self.current_node = self.route[0]
                self.remaining_distance = nx.shortest_path_length(self.graph, self.current_node, self.end_node,
                                                                  weight='length')
                self.send_coordinates()
            else:
                await  self.stop_navigation()
        else:
            print(f"[{self.id}] -> make_step called while not navigating.")

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
    producer = Producer({'bootstrap.servers': 'localhost:9092'})
    # Command queue for communicating with scooter instances
    command_queue = Queue()
    graph = await load_graph(graph_file_path)
    print("Scooter start init.")
    # Initialize scooters (for simplicity, starting and ending nodes are not dynamically chosen here)
    scooters = [
        Scooter(id='1_1', producer=producer, topic='scooter_commands', graph=graph, command_queue=Queue(),
                loop=asyncio.get_running_loop()),
        Scooter(id='1_2', producer=producer, topic='scooter_commands', graph=graph, command_queue=Queue(),
                loop=asyncio.get_running_loop())]

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