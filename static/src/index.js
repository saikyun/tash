import * as ch from "./character.js"
import { hits } from "./physics.js"

const sprites = {}

const p1 = ch.create({
  x: Math.floor((ch.RIGHT_SIDE - ch.LEFT_SIDE) * 0.4),
  key: {
    punch: "a",
    left: "o",
    right: "u",
    crouch: "e",
    jump: "ö",
    restart: "x",
  },
})

const p2 = ch.create({
  x: Math.floor((ch.RIGHT_SIDE - ch.LEFT_SIDE) * 0.6),
  key: {
    punch: "z",
    left: "ArrowLeft",
    right: "ArrowRight",
    crouch: "ArrowDown",
    jump: "ArrowUp",
    restart: "x",
  },
})

function preload() {
  sprites.character = loadImage("./assets/character-sheet.png")
  p1.sheet = sprites.character
  p2.sheet = sprites.character
}

function setup() {
  createCanvas(700, 400)
  noSmooth()

  sprites.character.loadPixels()
}

function keyPressed() {
  ch.key(p1, key)
  ch.key(p2, key)
}

function keyReleased() {
  ch.key_up(p1, key)
  ch.key_up(p2, key)
}

const update = () => {
  ch.update(p1, p2)
  ch.update(p2, p1)
  ch.post_update(p1)
  ch.post_update(p2)
}

const last = (l) => l[l.length - 1]

const dbg = (...stuff) => {
  console.log(...stuff)
  return last(stuff)
}

window.dbg = dbg

const update_flip = () => {
  if (p1.x > p2.x) {
    if (p1.y == ch.GROUND_Y) {
      p1.flipped = true
    }
    if (p2.y == ch.GROUND_Y) {
      p2.flipped = false
    }
    p1.right_side = true
    p2.right_side = false
  } else if (p1.x < p2.x) {
    if (p1.y == ch.GROUND_Y) {
      p1.flipped = false
    }
    if (p2.y == ch.GROUND_Y) {
      p2.flipped = true
    }
    p1.right_side = false
    p2.right_side = true
  }
}

var freeze_i = 0

window.freeze = (x) => (freeze_i = Math.max(freeze_i, 0) + x + 1)
window.debug_draws = []

const draw_hp_bar = ({ hp, max_hp }, start_x) => {
  noStroke()
  fill("black")
  rect(start_x, 20, max_hp + 4, 20)
  if (hp > 0) {
    fill("green")
    rect(start_x + 2, 22, hp, 16)
  }
}

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

  draw_hp_bar(p1, 20)
  draw_hp_bar(p2, 200)

  debug_draws.forEach((f) => f())

  window.debug_draws.length = 0

  pop()
}

window.preload = preload
window.setup = setup
window.draw = draw
window.keyPressed = keyPressed
window.keyReleased = keyReleased
