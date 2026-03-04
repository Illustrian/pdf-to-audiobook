from pathlib import Path

def build_pdf(text: str) -> bytes:
    objs: list[tuple[int, str]] = []

    def obj(n: int, s: str) -> None:
        objs.append((n, s))

    obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
    obj(
        3,
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] '
        '/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    )
    stream = f"BT /F1 24 Tf 50 80 Td ({text}) Tj ET\n"
    obj(4, f"<< /Length {len(stream.encode('latin-1'))} >>\nstream\n{stream}endstream")
    obj(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

    out = bytearray()
    out += b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'

    offsets: dict[int, int] = {0: 0}
    for n, body in objs:
        offsets[n] = len(out)
        out += f"{n} 0 obj\n".encode('ascii')
        out += body.encode('latin-1')
        out += b'\nendobj\n'

    xref_pos = len(out)
    out += b'xref\n'
    out += f"0 {len(objs) + 1}\n".encode('ascii')
    out += b'0000000000 65535 f \n'
    for i in range(1, len(objs) + 1):
        out += f"{offsets[i]:010d} 00000 n \n".encode('ascii')

    out += b'trailer\n'
    out += f"<< /Size {len(objs) + 1} /Root 1 0 R >>\n".encode('ascii')
    out += b'startxref\n'
    out += f"{xref_pos}\n".encode('ascii')
    out += b'%%EOF\n'
    return bytes(out)


if __name__ == '__main__':
    pdf = build_pdf('Hello world.')
    path = Path('apps/web/tests/fixtures')
    path.mkdir(parents=True, exist_ok=True)
    (path / 'hello.pdf').write_bytes(pdf)
    print('wrote', path / 'hello.pdf', 'bytes', len(pdf))
