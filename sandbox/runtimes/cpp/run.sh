#!/bin/sh
set -e

# Biên dịch mã nguồn C++ với cờ an toàn và tối ưu hóa
if [ -f "solution.cpp" ]; then
    g++ -O3 -std=c++20 solution.cpp -o /tmp/solution 2>&1
    if [ $? -eq 0 ]; then
        /tmp/solution
    fi
else
    echo "Error: solution.cpp not found" >&2
    exit 1
fi
