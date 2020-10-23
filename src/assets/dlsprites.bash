#!/usr/bin/env bash

while IFS=' ' read -r col1 col2
do
    wget "$col1"
done
