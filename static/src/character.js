import { sprite, frame } from "./render.js"
import { hits, overlap } from "./physics.js"

export const GROUND_Y = 150
export const RIGHT_SIDE = 400
export const LEFT_SIDE = 10

export const holding_forward = (c) =>
  c.intent.walk_direction == (c.right_side ? -1 : 1)

export const holding_forward_mult = (c) => (holding_forward(c) ? 1 : -1)

export const is_grounded = (c) => c.y >= GROUND_Y

export const wants_to_jump = (c) => c.intent.jump
export const wants_to_crouch = (c) => c.intent.crouch
// 3 frame buffer
export const wants_to_punch = (c) =>
  !holding_forward(c) && c.held_intent.punch < 3 && c.intent.punch
export const wants_to_kick = (c) =>
  holding_forward(c) && c.held_intent.punch < 3 && c.intent.punch
export const wants_to_shoot = (c) =>
  c.held_intent.special < 3 &&
  c.intent.special &&
  !bullets.some((b) => b.shooter === c && b.single)
export const wants_to_dash = (c) => c.held_intent.dash < 3 && c.intent.dash

export const dash_cancel = (c, enemy) => {
  c.meter -= 50
  freeze(enemy, 25)
  set_state(c, c.dash_state)
}

export const set_state = (c, state) => {
  if (c.state.exit) {
    c.state.exit(c)
  }
  console.assert(state)
  c.state = state
  c.state_time = 0

  if (c.state.init) {
    c.state.init(c)
  }
}

export const bullets = []
export const bullets_to_remove = []

export const add_meter = (c, meter) =>
  (c.meter = Math.min(100, c.meter + meter))

export const fire_bullet = (shooter, enemy, x, y, direction, bullet) => {
  const { damage, speed, sprite, spawn_point } = bullet
  bullets.push({
    ...bullet,
    projectile: true,
    can_hit: true,
    shooter: shooter,
    enemy: enemy,
    x: x + spawn_point[0],
    y: y + spawn_point[1],
    direction,
    state_time: 0,
    flipped: shooter.right_side,
  })
}

export const update_bullet = (bullet, i) => {
  bullet.state_time++
  bullet.x += bullet.speed(bullet.state_time) * bullet.direction

  if (bullet.damage && try_to_hit(bullet, bullet.enemy, bullet)) {
    bullets_to_remove.push(i)
    if (bullet.on_hit) {
      bullet.on_hit(bullet)
    }
  } else if (bullet.lifetime <= bullet.state_time) {
    bullets_to_remove.push(i)
  }
}

export const draw_bullet = (bullet) => {
  const { x, y, sheet, state_time, current_anim, flipped } = bullet

  var f = Math.floor((state_time / current_anim.speed) % current_anim.len)

  /*
  if (Math.floor(state_time / current_anim.speed) > 2) {
    f = 3 + (Math.floor(state_time / current_anim.speed) % 2)
  }
  */

  frame(sheet, x, y, ...sprite(current_anim, f), {
    flipped: flipped,
  })
}

export const which_frame = (c) =>
  Math.floor((c.state_time / c.current_anim.speed) % c.current_anim.len)

export const try_to_hit = (c, enemy, atk_data) => {
  var [px, py] = sprite(c.current_anim, which_frame(c))
  // py + 1 is the hitbox of the attack
  py += 1

  const hs = hits(c.sheet, px, py, { flipped: c.flipped })
  var did_hit = false
  hs.forEach(([ohx, ohy]) => {
    if (c.can_hit && overlap(c, enemy, ohx, ohy)) {
      c.can_hit = false
      if (enemy.blocking) {
        if (c.projectile) {
          add_meter(c.shooter, atk_data.block_meter_gain)
        } else {
          add_meter(c, atk_data.block_meter_gain)
        }
        add_meter(enemy, Math.floor(atk_data.block_meter_gain / 2))
        enemy.blockstun = atk_data.blockstun
        enemy.pushback = atk_data.pushback * 2
        set_state(enemy, enemy.blockstun_state)
        freeze(enemy, atk_data.block_freeze)
        if (!c.projectile) {
          freeze(c, atk_data.block_freeze)
        }
      } else {
        if (c.projectile) {
          add_meter(c.shooter, atk_data.hit_meter_gain)
        } else {
          add_meter(c, atk_data.hit_meter_gain)
        }
        add_meter(enemy, Math.floor(atk_data.damage / 2))
        if (enemy.hitstun > 0 || !is_grounded(enemy)) {
          combo_inc()
        } else {
          combo_reset()
        }

        if (atk_data.knockdown) {
          enemy.y_pushback += 5
          enemy.y -= 3
        }

        enemy.hitstun = atk_data.hitstun
        enemy.pushback = atk_data.pushback * 0.5
        set_state(enemy, enemy.hitstun_state)
        enemy.hp -= atk_data.damage
        if (enemy.hp <= 0) {
          freeze(enemy, atk_data.freeze * 5)
          if (!c.projectile) {
            freeze(c, atk_data.freeze * 5)
          }
          setTimeout(() => set_state(c, c.win_state), 1500)
        } else {
          freeze(enemy, atk_data.freeze)
          if (!c.projectile) {
            freeze(c, atk_data.freeze)
          }
        }
      }
      did_hit = true
    }
  })

  return did_hit
}

export const create = ({ specific_data, x, y, meter, sheet, key } = {}) => {
  y = y || GROUND_Y
  meter = meter || 0

  console.assert(x, "need x")
  console.assert(specific_data.current_anim, "need current_anim")
  return {
    ...specific_data,
    freeze_i: 0,
    meter: meter,
    max_meter: 100,
    y_pushback: 0,
    freeze_delay: 0,
    momentum: 1,
    can_hit: false,
    intent: {
      jump: false,
      walk_direction: 0,
      punch: false,
      restart: false,
      special: false,
    },
    held_intent: { punch: 0, special: 0, dash: 0 },
    state_time: 0,
    hp: 120,
    max_hp: 120,
    x,
    y,
    punching: false,
    wasPunching: false,
    walking: 0,
    wasWalking: true,
    jumping: false,
    wasJumping: false,
    wrouching: false,
    wasCrouching: false,
    i: 0,
    time_since_left_ground: 0,
    fall_speed: 0,
    key,
    flipped: false,
  }
}

export const draw = (c) => {
  // fill(0, 0, 0, 80)
  // ellipse(
  //   c.x + 13 + (c.right_side ? 6 : 0),
  //   GROUND_Y + 30,
  //   18 - (GROUND_Y - c.y) * 0.2,
  //   8 - (GROUND_Y - c.y) * 0.1
  // )

  if (c.pre_draw) {
    c.pre_draw(c)
  }

  frame(c.sheet, c.x, c.y, ...sprite(c.current_anim, which_frame(c)), {
    flipped: c.flipped,
  })
}

export const key = (c, keyCode) => {
  if (keyCode == c.key.punch) {
    c.intent.punch = true
  } else if (keyCode == c.key.crouch) {
    c.intent.crouch = true
  } else if (keyCode == c.key.dash) {
    c.intent.dash = true
  } else if (keyCode == c.key.left) {
    c.intent.walk_direction -= 1
  } else if (keyCode == c.key.right) {
    c.intent.walk_direction += 1
  } else if (keyCode == c.key.jump) {
    c.intent.jump = true
  } else if (keyCode == c.key.special) {
    c.intent.special = true
  } else if (keyCode == c.key.restart) {
    c.intent.restart = true
  } else {
    //    console.log("unused:", keyCode)
  }

  if (c.intent.walk_direction > 1) {
    c.intent.walk_direction = 1
  }
  if (c.intent.walk_direction < -1) {
    c.intent.walk_direction = -1
  }
}

export const key_up = (c, keyCode) => {
  if (keyCode == c.key.left) {
    c.intent.walk_direction += 1
  } else if (keyCode == c.key.dash) {
    c.intent.dash = false
  } else if (keyCode == c.key.right) {
    c.intent.walk_direction -= 1
  } else if (keyCode == c.key.crouch) {
    c.intent.crouch = false
  } else if (keyCode == c.key.jump) {
    c.intent.jump = false
  } else if (keyCode == c.key.special) {
    c.intent.special = false
  } else if (keyCode == c.key.punch) {
    c.intent.punch = false
  } else if (keyCode == c.key.restart) {
    c.intent.restart = false
  }
}

const update_state = (c, enemy) => {
  if (c.state.update) {
    c.state.update(c, enemy)
  }
  for (var [pred, action] of c.state.transitions || []) {
    if (pred(c, enemy)) {
      if (typeof action === "function") {
        action(c, enemy)
      } else {
        set_state(c, action)
      }
      break
    }
  }
}

export const update = (c, enemy, flipped) => {
  update_state(c, enemy)

  const hs = hits(
    c.sheet,
    ...sprite(c.current_anim, Math.floor(c.i / c.current_anim.speed)),
    { flipped: c.flipped }
  )

  for (var [x, y] of hs) {
    while (overlap(c, enemy, x, y)) {
      enemy.x += enemy.right_side ? 1 : -1
      if (enemy.x > RIGHT_SIDE) {
        c.x += c.right_side ? 1 : -1
      }
      if (enemy.x < LEFT_SIDE) {
        c.x += c.right_side ? 1 : -1
      }
      break
    }
  }

  if (c.intent.punch) {
    c.held_intent.punch += 1
  } else {
    c.held_intent.punch = 0
  }

  if (c.intent.special) {
    c.held_intent.special += 1
  } else {
    c.held_intent.special = 0
  }

  if (c.intent.dash) {
    c.held_intent.dash += 1
  } else {
    c.held_intent.dash = 0
  }

  if (c.intent.restart && c.hp <= 0) {
    window.location.reload()
  }
}

export const post_update = (c) => {
  if (c.x <= LEFT_SIDE) {
    c.x = LEFT_SIDE
  }
  if (c.x >= RIGHT_SIDE) {
    c.x = RIGHT_SIDE
  }

  c.state_time++
}
