#!/bin/bash
if [ "$1" = "init" ]; then

    if [ -f "/tmp/minitwit.db" ]; then 
        echo "Database already exists."
        exit 1
    fi
    echo "Putting a database to /tmp/minitwit.db..."
    node src/init.js
elif [ "$1" = "start" ]; then
    echo "Starting minitwit..."
    nohup npm start > /tmp/out.log 2>&1 &
    echo $! > /tmp/minitwit.pid
elif [ "$1" = "stop" ]; then
    echo "Stopping minitwit..."
    MINITWIT_PID=$(cat /tmp/minitwit.pid)
    kill -TERM "$MINITWIT_PID"
    rm /tmp/minitwit.pid
elif [ "$1" = "inspectdb" ]; then
    ./flag_tool -i | less
elif [ "$1" = "flag" ]; then
    ./flag_tool "$@"
else
  echo "I do not know this command..."
fi