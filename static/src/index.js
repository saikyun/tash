import * as ch from "./character.js"
import * as large_speakerman from "./large_speakerman.js"
import * as tri_rpg from "./tri_rpg.js"
import { hits } from "./physics.js"

var training_mode = true

window.SPRITE_SIZE = 64
const sprites = {}

window.combo_counter = 0
var combo_timer = 0

window.combo_inc = () => combo_counter++
window.combo_reset = () => (combo_counter = 0)

const left_controls = {
  punch: "u",
  special: "i",
  dash: "d",
  left: "a",
  right: "e",
  crouch: "o",
  jump: "ä",
  restart: "Escape",
}

const right_controls = {
  punch: "w",
  special: "m",
  dash: "b",
  left: "ArrowLeft",
  right: "ArrowRight",
  crouch: "ArrowDown",
  jump: "ArrowUp",
  restart: "Escape",
}

const p1 = ch.create({
  //specific_data: large_speakerman.specific_data(),
  specific_data: tri_rpg.specific_data(),
  meter: training_mode ? 100 : 25,
  x: Math.floor((ch.RIGHT_SIDE - ch.LEFT_SIDE) * 0.6),
  key: right_controls,
})

const p2 = ch.create({
  specific_data: tri_rpg.specific_data(),
  meter: training_mode ? 100 : 25,
  x: Math.floor((ch.RIGHT_SIDE - ch.LEFT_SIDE) * 0.4),
  key: left_controls,
})

function preload() {
  sprites.large_speakerman = loadImage("./assets/large-speakerman-sheet.png")
  sprites.tri_artillerist_skibidi = loadImage(
    "./assets/tri-artillerist-skibidi-toilet-sheet.png"
  )
  p1.sheet = sprites.large_speakerman
  p1.sheet = sprites.tri_artillerist_skibidi
  p2.sheet = sprites.tri_artillerist_skibidi
}

function setup() {
  createCanvas(1400, 800)
  noSmooth()

  for (var k in sprites) {
    sprites[k].loadPixels()
  }
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
  if (p1.freeze_i <= 0 || p1.freeze_delay > 0) {
    ch.update(p1, p2)
  }
  if (p2.freeze_i <= 0 || p1.freeze_delay > 0) {
    ch.update(p2, p1)
  }
  if (p1.freeze_i <= 0 || p1.freeze_delay > 0) {
    ch.post_update(p1)
  }
  if (p2.freeze_i <= 0 || p1.freeze_delay > 0) {
    ch.post_update(p2)
  }
  if (p1.freeze_delay <= 0) {
    p1.freeze_i--
  }
  if (p2.freeze_delay <= 0) {
    p2.freeze_i--
  }
  p1.freeze_delay--
  p2.freeze_delay--
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

window.freeze = (obj, x) => {
  if (obj.freeze_i <= 0) {
    obj.freeze_delay = 1
  }
  obj.freeze_i = Math.max(obj.freeze_i, 0) + x + 1
}
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

const draw_meter_bar = ({ meter, max_meter }, start_x) => {
  noStroke()
  fill("black")
  rect(start_x, 50, max_meter + 4, 20)

  if (meter > 0) {
    if (meter >= 50) {
      fill("yellow")
    } else {
      fill("blue")
    }
    rect(start_x + 2, 52, meter, 16)
  }
}

function draw() {
  push()
  background(200, 200, 230)
  scale(3)

  noStroke()
  fill("teal")
  rect(0, ch.GROUND_Y + 20, 1000, 700)
  fill("gray")
  rect(0, 0, ch.LEFT_SIDE + 5, ch.GROUND_Y + SPRITE_SIZE)
  fill("gray")
  rect(ch.RIGHT_SIDE + 27, 0, 100, ch.GROUND_Y + SPRITE_SIZE)

  update_flip()
  update()
  update_flip()

  ch.bullets.forEach(ch.update_bullet)

  ch.bullets_to_remove.forEach((b) => ch.bullets.splice(b, 1))
  ch.bullets_to_remove.length = 0

  ch.draw(p1)
  ch.draw(p2)

  ch.bullets.forEach(ch.draw_bullet)

  draw_hp_bar(p1, 20)
  draw_hp_bar(p2, 300)

  draw_meter_bar(p1, 20)
  draw_meter_bar(p2, 300)

  if (combo_counter > 0) {
    textSize(20)
    text("Combo", 190, 30)
    textSize(70)
    text(combo_counter + 1, 200, 100)
  }

  if (
    p1.hitstun > 0 ||
    p2.hitstun > 0 ||
    !ch.is_grounded(p1) ||
    !ch.is_grounded(p2)
  ) {
    combo_timer = 30
  }

  combo_timer--

  if (combo_timer <= 0) {
    combo_reset()
    if (training_mode) {
      p1.hp = p1.max_hp
      p2.hp = p2.max_hp
      p1.meter = p1.max_meter
      p2.meter = p2.max_meter
    }
  }

  debug_draws.forEach((f) => f())

  window.debug_draws.length = 0

  pop()
}

ch.set_state(p1, tri_rpg.shoot_state)
ch.set_state(p2, tri_rpg.shoot_state)

window.preload = preload
window.setup = setup
window.draw = draw
window.keyPressed = keyPressed
window.keyReleased = keyReleased
