export const frame = (sheet, dx, dy, tx, ty, { w, h, flipped } = {}) => {
  w = w || 32
  h = h || 32
  flipped = flipped === undefined ? false : flipped
  push()
  translate(dx, dy)
  if (flipped) {
    push()
    translate(w, 0)

    scale(-1, 1, 1)
  }
  image(sheet, 0, 0, w, h, tx * w, ty * h, w, h)

  if (flipped) {
    scale(-1, 1, 1)
    translate(-w, 0)
    pop()
  }
  pop()
}

export const sprite = (frames, i) => [i, frames.row]
