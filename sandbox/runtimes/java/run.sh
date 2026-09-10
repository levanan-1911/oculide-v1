#!/bin/sh
set -e

# Biên dịch và thực thi mã nguồn Java với giới hạn bộ nhớ JVM
if [ -f "Solution.java" ]; then
    javac Solution.java 2>&1
    if [ $? -eq 0 ]; then
        java -Xmx128m -Xms16m -XX:+UseSerialGC Solution
    fi
else
    echo "Error: Solution.java not found" >&2
    exit 1
fi
