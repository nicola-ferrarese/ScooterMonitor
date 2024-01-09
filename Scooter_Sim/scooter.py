import asyncio
import os
import signal
import osmnx as ox
import random
import sys
from confluent_kafka import Producer

async def load_graph(file_path):
    return ox.load_graphml(file_path)

def save_graph(graph, file_path):
    ox.save_graphml(graph, file_path)

# Function to choose a random node from the graph
def choose_random_node(graph):
    nodes = list(graph.nodes)
    return random.choice(nodes)

# Function to send coordinates to Kafka
def send_coordinates(producer, topic, node_id, graph):
    x, y = graph.nodes[node_id]['x'], graph.nodes[node_id]['y']
    message = f"Node {node_id}: Latitude {y}, Longitude {x}"
    producer.produce(topic, message.encode('utf-8'))
    producer.flush()

# Asynchronous main function
async def main(graph_file_path, stop_event):
    graph = await load_graph(graph_file_path)
    producer = Producer({'bootstrap.servers': 'localhost:9092'})
    try:
        while not stop_event.is_set():
            node_id = choose_random_node(graph)
            send_coordinates(producer, 'your_topic', node_id, graph)
            await asyncio.sleep(3)  # Sleep for 3 seconds before sending next message
    finally:
        print("Stopping the producer loop.")
        producer.flush()

if __name__ == "__main__":
    # get system arguments
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
    def signal_handler():
        stop_event.set()
    loop = asyncio.get_event_loop()
    loop.add_signal_handler(signal.SIGINT, signal_handler)
    try:
        loop.run_until_complete(main(graph_file_path, stop_event))
    finally:
        loop.close()
