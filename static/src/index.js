import * as ch from "./character.js"
import { hits } from "./physics.js"

const sprites = {}

const p1 = ch.create({
  x: 50,
  y: 150,
  key: { punch: 65, left: 79, right: 85, crouch: 69 },
})

const p2 = ch.create({
  x: 150,
  y: 150,
  key: { punch: 83, left: 72, right: 78, crouch: 84 },
})

function preload() {
  sprites.character = loadImage("./assets/character-sheet.png")
  p1.sheet = sprites.character
  p2.sheet = sprites.character
}

function setup() {
  createCanvas(400, 400)
  noSmooth()

  sprites.character.loadPixels()
  console.log(sprites.character.pixels)
  console.log(hits(sprites.character, 1, 3))
  // frame(sprites.character, 150, 100, 1, 3)
  /*
  const reee = []

  var xaxa = 0
  sprites.character.pixels.forEach((x, i) => {
    if (x === 18) {
      console.log([i, Math.floor(i / 4) % 192, Math.floor(i / (4 * 192))])
    }
    xaxa++
  })
  // 30720
  console.log("len: ", xaxa)
  console.log("actually 18:", reee)
  */
}

function keyPressed() {
  ch.key(p1, keyCode)
  ch.key(p2, keyCode)
}

function keyReleased() {
  ch.key_up(p1, keyCode)
  ch.key_up(p2, keyCode)
}

const update = () => {
  ch.update(p1, p2)
  ch.update(p2, p1)
}

const last = (l) => l[l.length - 1]

const log = (...stuff) => {
  console.log(...stuff)
  return last(stuff)
}

window.dbg = log

const update_flip = () => {
  if (p1.x > p2.x) {
    p1.flipped = true
    p2.flipped = false
  } else if (p1.x < p2.x) {
    p1.flipped = false
    p2.flipped = true
  }
}

var freeze_i = 0

window.freeze = (x) => (freeze_i = Math.max(freeze_i, 0) + x)
window.debug_draws = []

function draw() {
  push()
  background(250)
  scale(2)

  if (freeze_i <= 0) {
    update_flip()
    update()
    update_flip()
  }

  freeze_i -= 1

  ch.draw(p1)
  ch.draw(p2)

  debug_draws.forEach((f) => f())

  window.debug_draws.length = 0

  pop()
}

window.preload = preload
window.setup = setup
window.draw = draw
window.keyPressed = keyPressed
window.keyReleased = keyReleased
