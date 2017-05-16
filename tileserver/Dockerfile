FROM debian:jessie

# Create the app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install nodejs
RUN apt-get update \
    && apt-get install -y curl python python-pip \
    && curl -sL https://deb.nodesource.com/setup_7.x -o nodesetup.sh \
    && /bin/bash nodesetup.sh \
    && apt-get install -y nodejs zlib1g-dev libjpeg-dev python-dev
RUN pip install python-memcached
RUN pip install pillow

EXPOSE 9016

COPY tileserver.py /usr/src/app
COPY letters.png /usr/src/app

CMD ["python", "tileserver.py"]
