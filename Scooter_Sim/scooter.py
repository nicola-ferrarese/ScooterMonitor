import asyncio
import json
import os
import signal
import time
from concurrent.futures import ThreadPoolExecutor

import networkx as nx
import osmnx as ox
import random
import sys
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


async def run_consumer_in_thread(loop, config, topics, stop_event):
    executor = ThreadPoolExecutor(max_workers=1)
    await loop.run_in_executor(executor, receive_coordinates, config, topics, stop_event)


# Asynchronous main function
async def main(graph_file_path, stop_event):
    print("Starting the producer.")
    graph = await load_graph(graph_file_path)
    producer = Producer({'bootstrap.servers': 'localhost:9092'
                         })
    try:
        while not stop_event.is_set():
            route = Route(choose_random_node(graph), choose_random_node(graph), graph)
            send_coordinates(producer, 'routes', route)
            while route.make_step() is not None:
                if stop_event.is_set():
                    return  # Exit the function
                await asyncio.sleep(3)
                print("-> Sending coordinates.")
                send_coordinates(producer, 'routes', route)

    finally:
        print("Stopping the producer loop.")
        producer.flush()

    def deserializer(data):
        """Deserializes data from bytes to a JSON string."""
        return json.loads(data.decode('utf-8'))


if __name__ == "__main__":

    async def graceful_shutdown(loop, stop_event, tasks):
        print("Graceful shutdown initiated.")
        stop_event.set()  # Signal all tasks to terminate
        await asyncio.gather(*tasks)  # Wait for all tasks to complete
        loop.stop()  # Stop the event loop
        print("All tasks completed, shutting down.")


    def signal_handler(loop, stop_event, tasks):
        print("Signal received, initiating graceful shutdown.")
        asyncio.ensure_future(graceful_shutdown(loop, stop_event, tasks), loop=loop)


    if len(sys.argv) != 2:
        print("Usage: python scooter.py <path/to/graph/file.graphml>")
        print("If no path is specified, the default graph will be used.")
        graph_file_path = "graph.graphml"
    else:
        graph_file_path = sys.argv[1]

    if not os.path.exists(graph_file_path):
        print("Graph file not found, downloading from source.")
        # Load and save the graph from the source
        G = ox.graph_from_address("Corso Giuseppe Mazzini, 5, 47521 Cesena FC, Italy",
                                  dist=2000, network_type='drive')
        # OSM data are sometime incomplete so we use the speed module of osmnx to add missing edge speeds and travel times
        G = ox.add_edge_speeds(G)
        G = ox.add_edge_travel_times(G)
        print("Saving graph to file.")
        ox.save_graphml(G, graph_file_path)

    # Corrected approach:
    loop = asyncio.get_event_loop()
    stop_event = asyncio.Event()

    # Schedule the coroutine for execution
    send_coordinates_task = loop.create_task(main(graph_file_path, stop_event))
    get_msg_task = loop.create_task(
        run_consumer_in_thread(loop, {'bootstrap.servers': 'localhost:9092', 'group.id': 'test'}, ['routes'],
                               stop_event))
    tasks = [send_coordinates_task, get_msg_task]

    # Register the signal handler
    loop.add_signal_handler(signal.SIGINT, signal_handler, loop, stop_event, tasks)

    try:
        print("Starting the event loop.")
        loop.run_forever()
    finally:
        loop.run_until_complete(loop.shutdown_asyncgens())  # Close asynchronous generators
        loop.close()
        print("Event loop closed.")
