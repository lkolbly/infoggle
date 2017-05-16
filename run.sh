docker run -d --name memcache memcached
docker run -d --name mongo mongo
docker run -td -p 9016:9016 --link memcache:memcache lkolbly/infoggle-tileserver
docker run -it -p 9015:9015 --link mongo:mongo lkolbly/infoggle
