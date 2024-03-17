import asyncio
import json
import os
import signal
import time
import networkx as nx
import osmnx as ox
import random
import sys
from confluent_kafka import Producer
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
        return round(self.remaining_distance,0)

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


# Asynchronous main function
async def main(graph_file_path, stop_event):
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
    def signal_handler():
        print("Sending termination.")
        stop_event.set()


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
    # Interrupt handler
    stop_event = asyncio.Event()
    loop = asyncio.get_event_loop()
    loop.add_signal_handler(signal.SIGINT, signal_handler)
    try:
        print("Starting the producer.")
        loop.run_until_complete(main(graph_file_path, stop_event))
        print("Producer stopped.")
    finally:
        loop.close()
