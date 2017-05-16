import BaseHTTPServer
import memcache
import StringIO
from PIL import Image

cache = memcache.Client(["127.0.0.1:11211"])

letters_im = Image.open("letters.png")
letters = []
for i in range(26):
    im = letters_im.crop((i*32, 0, (i+1)*32, 32))
    #print im
    letters.append(im)

def makeTile(letter_images, contents, nrows, ncols):
    im = Image.new("RGB", (32*ncols, 32*nrows), "white")
    x = 0
    y = 0
    for c in contents:
        im.paste(letter_images[ord(c)-ord('a')], (x*32, y*32))
        x += 1
        if x >= ncols:
            x = 0
            y += 1
    return im

def makeTileCache(letter_images, contents, nrows, ncols):
    c = cache.get(contents)
    if c:
        print "Cache hit - %i bytes"%len(c)
        return c
    img = makeTile(letter_images, contents, nrows, ncols)

    output = StringIO.StringIO()
    img.save(output, "PNG")
    img_data = output.getvalue()
    output.close()

    cache.set(contents, img_data)
    print "Cache miss - %i bytes"%len(img_data)
    return img_data

class MyHandler(BaseHTTPServer.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        parts = self.path.split("/")[1:]
        #print parts
        if len(parts) < 3:
            self.wfile.write(parts)
            return
        rows = int(parts[0])
        cols = int(parts[1])
        contents = parts[2].replace(",","")
        im = makeTileCache(letters, contents, rows, cols)
        self.wfile.write(im)
        #im.save(self.wfile, "PNG")
        #self.wfile.write(self.path)

server_address = ('', 9016)
httpd = BaseHTTPServer.HTTPServer(server_address, MyHandler)
while True:
    httpd.handle_request()
