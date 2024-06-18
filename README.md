# Scooter Ride Application

## Overview

This application is a full-stack solution built using the MEVN (MongoDB, Express, Vue, Node.js) stack.
It provides a seamless experience for users to register, book, and ride scooters while offering a comprehensive dashboard for insights into scooter trip statistics and user behaviors.

## Features

- 🔐 **User Registration and Authentication**: Secure registration and login functionality using JWT tokens.
- 🛴 **Ride Booking**: Users can book and ride scooters, with real-time updates and commands managed through Kafka.
- 📊 **Dashboard**: Access detailed statistics on scooter trips and user behaviors, enabling data-driven decisions.
- 🌗 **Theme Switcher**: Toggle between light and dark modes for an enhanced user experience.

## Architecture

- 🖥️ **Frontend**: Developed with Vue 3, leveraging SCSS for styling. The frontend is designed to be responsive and user-friendly.
- 🌐 **Backend**: Built with Node.js and Express, providing robust API endpoints for the frontend. Real-time communication is handled using Socket.IO.
- 🗄️ **Database**: MongoDB is used to store user data, trip statistics, and scooter information.
- 📨 **Message Broker**: Kafka is used to manage communication between scooters and the backend, ensuring reliable and scalable message handling.
- 🛵 **Scooters**: Simulated using Python, each scooter runs asynchronously in its own thread, sending information and receiving commands.
- 🐳 **Containerization**: The entire application is containerized using Docker, allowing for easy deployment and scaling.
- ☁️ **Future Plans**: Integration with Kubernetes for orchestration and management of containers, enhancing scalability and reliability.