<?php

// Start Laravel development server on port 8000
$host = '0.0.0.0';
$port = 8000;
$publicPath = __DIR__ . '/public';

// Check if port is available
$socket = @fsockopen($host, $port, $errno, $errstr, 1);
if ($socket) {
    fclose($socket);
    echo "Port $port is already in use. Laravel server may already be running.\n";
    echo "Try accessing: http://localhost:$port\n";
    exit(1);
}

echo "Starting Laravel development server...\n";
echo "Server running at: http://localhost:$port\n";
echo "Document root: $publicPath\n";
echo "Press Ctrl+C to stop the server\n\n";

// Start the built-in PHP server
$command = "php -S $host:$port -t $publicPath server.php";
passthru($command);