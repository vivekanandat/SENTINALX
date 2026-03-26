from scapy.all import sniff, ARP, ICMP, IP, TCP

MY_IP = "10.86.174.136"

def packet_handler(pkt):
    # ===== ARP replies =====
    if pkt.haslayer(ARP):
        arp = pkt[ARP]
        if arp.op == 2:  # ARP Reply
            print(f"[ARP Reply] {arp.psrc} is at {arp.hwsrc}")

    # ===== ICMP replies =====
    elif pkt.haslayer(ICMP) and pkt.haslayer(IP):
        ip = pkt[IP]
        icmp = pkt[ICMP]

        # ICMP Echo Reply (from your ICMP probe)
        if icmp.type == 0:
            print(f"[ICMP Reply] {ip.src} is alive")

        # ICMP Destination Unreachable (from UDP probe)
        elif icmp.type == 3:
            print(f"[UDP Response] {ip.src} (port unreachable / filtered)")

    # ===== TCP replies =====
    elif pkt.haslayer(TCP) and pkt.haslayer(IP):
        ip = pkt[IP]
        tcp = pkt[TCP]
        flags = tcp.flags

        # SYN-ACK → port open
        if flags & 0x12 == 0x12:
            print(f"[TCP OPEN] {ip.src}:{tcp.sport}")

        # RST → port closed
        elif flags & 0x04:
            print(f"[TCP CLOSED] {ip.src}:{tcp.sport}")

        # SYN (rare, ignore mostly)
        elif flags & 0x02 and not flags & 0x10:
            print(f"[TCP SYN] {ip.src}:{tcp.sport}")

        # ACK (debug noise)
        elif flags & 0x10:
            pass  # ignore

print("Listening for scan replies...")

sniff(
    filter=f"arp or icmp or tcp",
    prn=packet_handler,
    store=False,
    timeout=5   # 👈 ADD THIS
)
