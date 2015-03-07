#!/usr/bin/env bash

ARGS="."
while getopts ":ap-:" opt; do
  case $opt in
    -)
      case "${OPTARG}" in
        host=*)
          val=${OPTARG#*=}
          opt=${OPTARG%=$val}
          ARGS="$ARGS -a ${val}"
          ;;
        port=*)
          val=${OPTARG#*=}
          opt=${OPTARG%=$val}
          ARGS="$ARGS -p $val"
          ;;
      esac
      ;;
    a) ARGS="$ARGS -a ${OPTARG}";;
    p) ARGS="$ARGS -p ${OPTARG}";;
  esac
done

./node_modules/http-server/bin/http-server ${ARGS}
