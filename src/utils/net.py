import socket

def make_udp_socket(bind_addr=None, port=None):
    """
    Utility to create a UDP socket optionally bound to an address.
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    if bind_addr and port:
        sock.bind((bind_addr, port))
    return sock
