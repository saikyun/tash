export const hits = (img, tx, ty, { w, h, flipped } = {}) => {
  const pixels = img.pixels

  w = w || 32
  h = h || 32
  flipped = flipped === undefined ? false : flipped

  const hs = []

  for (var y = ty * h; y < (ty + 1) * h; y++) {
    for (var x = tx * w; x < (tx + 1) * w; x++) {
      // const px = Math.floor(i / 4) % 192, Math.floor(i / (4 * 192))
      const rx = x * 4
      const ry = y * img.width * 4
      const alpha = pixels[ry + rx + 3]
      // console.log(
      //   "x/y:",
      //   x,
      //   y,
      //   "rx/ry:",
      //   rx,
      //   ry,

      //   "hit:",
      //   pixels[ry + rx],
      //   pixels[ry + rx + 1],
      //   pixels[ry + rx + 2],
      //   alpha
      // )
      if (alpha) {
        hs.push([flipped ? 32 - (x - tx * w) : x - tx * w, y - ty * h])
      }
    }
  }

  return hs
}

export const overlap = (c, enemy, ohx, ohy) => {
  // console.log(hx, hy)
  const hx = ohx + c.x - enemy.x
  const hy = ohy + c.y - enemy.y
  if (hx < 0 || hx > 32) {
    return false
  }
  if (hy < 0 || hy > 32) {
    return false
  }

  if (
    c.sheet.get(
      (enemy.flipped ? 32 - hx : hx) + (enemy.i % enemy.current_anim.len) * 32,
      hy + 32 * enemy.current_anim.row
    )[3] > 0
  ) {
    return true
  }

  return false
}
