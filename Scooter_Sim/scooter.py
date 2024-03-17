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
    kafka_config = {'bootstrap.servers': 'localhost:9092', 'group.id': 'scooter_group'}
    consumer = Consumer(kafka_config)
    consumer.subscribe(['scooter_commands'])
    print("Consumer started.")
    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                print(f"Consumer error: {msg.error()}")
                if msg.error().code() == KafkaException._PARTITION_EOF:
                    # End of partition event
                    continue
                else:
                    raise KafkaException(msg.error())
            else:
                # Successfully received a message, add it to the command queue
                message = msg.value().decode('utf-8')
                message = json.loads(message)
                #print(f"Received message: {message}")
                if message["status"] is not None:
                    print(f"Received status: {message['status']}")
                    asyncio.run_coroutine_threadsafe(scooter.command_queue.put(message['status']), loop)
                #print(f"Added command to queue: {msg.value().decode('utf-8')}")
    finally:
        consumer.close()
class Scooter:
    def __init__(self, id, producer, topic, graph, command_queue, loop):
        self.id = id
        self.producer = producer
        self.topic = topic
        self.graph = graph
        self.route = None
        self.status = 'idle'  # Possible states: idle, navigating, stopped
        self.remaining_distance = 0
        self.command_queue = command_queue
        self.loop = loop



    def run_consumer_in_thread(self,loop):
        print("Starting consumer thread.")
        #executor = ThreadPoolExecutor(max_workers=1)
        #await self.loop.run_in_executor(executor, run_consumer(self))
        thread = threading.Thread(target=run_consumer, args=(self,loop))
        thread.start()
        print("Consumer thread started.")
    async def process_commands(self):
        while True:
            command = await self.command_queue.get()
            # Process command here...
            print(f"Scooter {self.id} received command: {command}")
            # Example command processing logic
            if command == 'start' and self.status == 'idle':
                # For simplicity, hardcoded start and end nodes. In practice, these would be dynamic.
                asyncio.create_task(self.start_navigation(choose_random_node(self.graph), choose_random_node(self.graph)))
                #self.start_navigation(choose_random_node(self.graph), choose_random_node(self.graph))
                print(f"Scooter {self.id} started navigation.")
            elif command == 'stop':
                self.stop_navigation()
                print(f"Scooter {self.id} stopped navigation.")

    def json_serializer(self, data):
        """Converts data to a JSON string and encodes it to bytes."""
        return json.dumps(data).encode('utf-8')

    def send_coordinates(self):
        if self.current_node is not None:
            x, y = self.graph.nodes[self.current_node]['x'], self.graph.nodes[self.current_node]['y']
            data = {
                "status": self.status,
                "node_id": self.current_node,
                "x": x,
                "y": y,
                "remaining_distance": self.remaining_distance
            }
            serialized_data = self.json_serializer(data)
            self.producer.produce(self.topic, value=serialized_data)
            #self.producer.flush()

    async def start_navigation(self, start_node, end_node):
        self.status = 'navigating'
        self.current_node = start_node
        self.end_node = end_node
        self.route = nx.shortest_path(self.graph, start_node, end_node, weight='length')
        self.remaining_distance = nx.shortest_path_length(self.graph, start_node, end_node, weight='length')
        self.send_coordinates()  # Send initial coordinates

        while self.status == 'navigating':
            await asyncio.sleep(1)
            print("-> Making move")
            self.make_step()


    def stop_navigation(self):
        self.status = 'stopped'
        self.send_coordinates()  # Send final coordinates

    def make_step(self):
        if self.status == 'navigating' and self.route:
            # Assume the first node in the route is the current location, so pop it
            self.route.pop(0)
            if len(self.route) > 0:
                self.current_node = self.route[0]
                self.remaining_distance = nx.shortest_path_length(self.graph, self.current_node, self.end_node,
                                                                  weight='length')
                self.send_coordinates()
            else:
                self.stop_navigation()

    async def process_commandFFs(self, command_queue):
        while self.status != 'stopped':
            if not command_queue.empty():
                command = await command_queue.get()
                if command == 'start' and self.status == 'idle':
                    # For simplicity, hardcoded start and end nodes. In practice, these would be dynamic.
                    self.start_navigation(choose_random_node(self.graph), choose_random_node(self.graph))
                elif command == 'stop':
                    self.stop_navigation()
            await asyncio.sleep(1)  # Prevent this loop from hogging the CPU


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


# Function to send coordinates to Kafka
def send_coordinates(producer, topic, route: Route):
    node_id = route.route[0]
    x, y = route.env_map.nodes[node_id]['x'], route.env_map.nodes[node_id]['y']
    message = f"Remaining distance: {route.get_remaining_distance()} meters, Node {node_id}, x: {x}, y: {y}"
    data = {
        "distance": route.get_remaining_distance(),
        "node_id": node_id,
        "x": x,
        "y": y
    }
    # Serialize data
    serialized_data = json_serializer(data)

    # print(message)
    keyEn = json.dumps(node_id).encode('utf-8')
    producer.produce(topic, key=keyEn, value=serialized_data)
    producer.flush()


def receive_coordinates(config, topics, stop_event):
    # Create a Consumer instance
    consumer = Consumer(config)
    print('Consumer created')
    try:
        # Subscribe to topics
        consumer.subscribe(topics)

        # Continuously poll for messages
        while not stop_event.is_set():
            msg = consumer.poll(timeout=1.0)
            if msg is None:  # No message returned within timeout
                continue
            if msg.error():
                if msg.error().code() == KafkaException._PARTITION_EOF:
                    # End of partition event
                    print(f'End of partition reached {msg.topic()}[{msg.partition()}] @ {msg.offset()}')
                elif msg.error():
                    raise KafkaException(msg.error())
            else:
                # Successfully received a message
                print(f'Received message: {msg.value().decode("utf-8")}')

    finally:
        print('Closing consumer')
        # Close down consumer to commit final offsets.
        consumer.close()



async def main(stop_event, graph_file_path="cesena.graphml"):
    # Load the graph (this could be a simplified example; adjust as necessary for your use case)
    #graph = ox.graph_from_place('Piedmont, California, USA', network_type='drive')


    print("Enter Main.")
    loop = asyncio.get_event_loop()
    producer = Producer({'bootstrap.servers': 'localhost:9092'})
    # Command queue for communicating with scooter instances
    command_queue = Queue()
    graph = await load_graph(graph_file_path)
    print("Scooter start init.")
    # Initialize scooters (for simplicity, starting and ending nodes are not dynamically chosen here)
    scooters = [
        Scooter(id='Scooter1', producer=producer, topic='scooter_commands', graph=graph, command_queue=command_queue, loop=asyncio.get_running_loop()),]
    print("Scooter init done.")
    # Start listening for commands in each scooter
    for scooter in scooters:
        scooter.run_consumer_in_thread(loop = asyncio.get_running_loop())
    print("Scooter started listening.")
    # Process commands in each scooter
    tasks = [asyncio.create_task(scooter.process_commands()) for scooter in scooters]
    loop.add_signal_handler(signal.SIGINT, signal_handler, loop, stop_event, tasks)

    # Set up Kafka producer (ensure to configure as per your Kafka setup)
    #producer = Producer({'bootstrap.servers': 'localhost:9092'})



    # Example commands (in a real scenario, these would come from user input or another part of the application)
    await asyncio.sleep(1)  # Simulate some delay
    await command_queue.put('start')  # Command to start navigating

    # Wait for all tasks to complete (in this case, they should complete after receiving the 'stop' command)
    await asyncio.gather(*tasks)


if __name__ == '__main__':

    #asyncio.run(main())
    async def graceful_shutdown(loop, stop_event, tasks):
        print("Graceful shutdown initiated.")
        stop_event.set()  # Signal all tasks to terminate
        await asyncio.gather(*tasks)  # Wait for all tasks to complete
        loop.stop()  # Stop the event loop
        print("All tasks completed, shutting down.")


    def signal_handler(loop, stop_event, tasks):
        print("Signal received, initiating graceful shutdown.")
        asyncio.ensure_future(graceful_shutdown(loop, stop_event, tasks), loop=loop)
    # Corrected approach:
    loop = asyncio.get_event_loop()
    stop_event = asyncio.Event()

    # Register the signal handler
    loop.create_task(main(stop_event))

    try:
        print("Starting the event loop.")
        loop.run_forever()
    finally:
        loop.run_until_complete(loop.shutdown_asyncgens())  # Close asynchronous generators
        loop.close()
        print("Event loop closed.")