// TODO: fix what can cancel into each other
// state machine??? :O

// intent (from controller, e.g. jump or punch)
// handle intent (depends on state)
// update
// render / maybe just set data pertaining to rendering

import { sprite, frame } from "./render.js"
import { hits, overlap } from "./physics.js"

export const GROUND_Y = 150
export const RIGHT_SIDE = 400
export const LEFT_SIDE = 10

// const idle = { row: 0, len: 2, speed: 10 }
// const walk = { row: 1, len: 2, speed: 10 }
// const punch = { row: 2, len: 4, speed: 2 }
// const crouch = { row: 4, len: 1, speed: 10 }
// const standing_damage = { row: 5, len: 2, speed: 1 }
// const jump = { row: 6, len: 1, speed: 10 }
// const jump_kick = { row: 7, len: 1, speed: 10 }
// const jumping_damage = { row: 9, len: 1, speed: 10 }
// const standing_block = { row: 10, len: 1, speed: 10 }
// const knocked_out = { row: 11, len: 2, speed: 10 }
// const kick = { row: 12, len: 4, speed: 5 }

const idle = { row: 0, len: 2, speed: 10 }
const walk = { row: 1, len: 2, speed: 10 }
const punch = { row: 2, len: 2, speed: 2 }
const crouch = { row: 4, len: 1, speed: 10 }
const standing_damage = { row: 5, len: 2, speed: 1 }
const jump = { row: 6, len: 1, speed: 10 }
const jump_kick = { row: 7, len: 1, speed: 10 }
const jumping_damage = { row: 9, len: 1, speed: 10 }
const standing_block = { row: 10, len: 1, speed: 10 }
const knocked_out = { row: 11, len: 3, speed: 10 }
const kick = { row: 12, len: 4, speed: 5 }
const recovery = { row: 14, len: 1, speed: 5 }
const shoot_fast = { row: 15, len: 2, speed: 13 }
const shoot_slow = { row: 15, len: 2, speed: 18 }
const bullet = { row: 16, len: 5, speed: 4 }
const bullet_hit = { row: 18, len: 1, speed: 4 }
const dash = { row: 19, len: 1, speed: 4 }
const backdash = { row: 20, len: 1, speed: 4 }
const low_punch = { row: 21, len: 5, speed: 25 }
const crouching_recovery = { row: 23, len: 1, speed: 5 }

const holding_forward = (c) =>
  c.intent.walk_direction == (c.right_side ? -1 : 1)

const holding_forward_mult = (c) => (holding_forward(c) ? 1 : -1)

const wants_to_jump = (c) => c.intent.jump
const wants_to_crouch = (c) => c.intent.crouch
// 3 frame buffer
const wants_to_punch = (c) =>
  !holding_forward(c) && c.held_intent.punch < 3 && c.intent.punch
const wants_to_kick = (c) =>
  holding_forward(c) && c.held_intent.punch < 3 && c.intent.punch
const wants_to_shoot = (c) =>
  c.held_intent.special < 3 &&
  c.intent.special &&
  !bullets.some((b) => b.shooter === c && b.single)
const wants_to_dash = (c) => c.held_intent.dash < 3 && c.intent.dash

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

const jump_state = {}
const fall_state = {}
const crouch_state = {}
const idle_state = {}
const walk_state = {}
const punch_state = {}
const low_punch_state = {}
const recovery_state = {}
const hitstun_state = {}
const blockstun_state = {}
const jump_kick_state = {}
const win_state = {}
const knocked_out_state = {}
const kick_state = {}
export const dash_state = {}
export const shoot_state = {}

export const bullets = []
export const bullets_to_remove = []

const add_meter = (c, meter) => (c.meter = Math.min(100, c.meter + meter))

const fire_bullet = (shooter, enemy, x, y, direction, bullet) => {
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

const bullet_hit_data = (sheet) => ({
  sheet: sheet,
  speed: (t) => 0,
  spawn_point: [0, 0],
  current_anim: bullet_hit,
  lifetime: 20,
})

export const update_bullet = (bullet, i) => {
  bullet.state_time++
  bullet.x += bullet.speed(bullet.state_time) * bullet.direction

  if (bullet.damage && try_to_hit(bullet, bullet.enemy, bullet)) {
    bullets_to_remove.push(i)
    fire_bullet(
      bullet.shooter,
      bullet.enemy,
      bullet.x,
      bullet.y,
      bullet.direction,
      bullet_hit_data(bullet.sheet)
    )
  } else if (bullet.lifetime <= bullet.state_time) {
    bullets_to_remove.push(i)
  }
}

export const draw_bullet = (bullet) => {
  const { x, y, sheet, state_time, current_anim, flipped } = bullet

  var f = Math.floor((state_time / current_anim.speed) % current_anim.len)

  if (Math.floor(state_time / current_anim.speed) > 2) {
    f = 3 + (Math.floor(state_time / current_anim.speed) % 2)
  }

  frame(sheet, x, y, ...sprite(current_anim, f), {
    flipped: flipped,
  })
}

Object.assign(knocked_out_state, {
  init: (c) => (c.current_anim = knocked_out),
  update: (c) => (c.state_time > 21 ? (c.state_time = 21) : null),
})

Object.assign(win_state, {
  init: (c) => (c.current_anim = idle),
})

Object.assign(crouch_state, {
  init: (c) => (c.current_anim = crouch),
  transitions: [
    [(c) => c.intent.crouch !== true, idle_state],
    [wants_to_punch, low_punch_state],
  ],
})

const which_frame = (c) =>
  Math.floor((c.state_time / c.current_anim.speed) % c.current_anim.len)

const try_to_hit = (c, enemy, atk_data) => {
  var [px, py] = sprite(c.current_anim, which_frame(c))
  // py + 1 is the hitbox of the attack
  py += 1

  const hs = hits(c.sheet, px, py, { flipped: c.flipped })
  var did_hit = false
  hs.forEach(([ohx, ohy]) => {
    if (c.can_hit && overlap(c, enemy, ohx, ohy)) {
      console.log("YEAH?")
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
        set_state(enemy, blockstun_state)
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
        set_state(enemy, hitstun_state)
        enemy.hp -= atk_data.damage
        if (enemy.hp <= 0) {
          freeze(enemy, atk_data.freeze * 5)
          if (!c.projectile) {
            freeze(c, atk_data.freeze * 5)
          }
          setTimeout(() => set_state(c, win_state), 1500)
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

const dash_cancel = (c, enemy) => {
  c.meter -= 50
  freeze(enemy, 25)
  set_state(c, dash_state)
}

Object.assign(punch_state, {
  init: (c) => {
    c.current_anim = punch
    c.can_hit = true
  },
  transitions: [
    [(c) => wants_to_shoot(c) && c.can_hit == false, shoot_state],
    [
      (c) => wants_to_dash(c) && c.can_hit == false && c.meter >= 50,
      dash_cancel,
    ],
    [
      (c) => c.state_time >= 5,
      (c) => {
        c.recovery = 8
        set_state(c, recovery_state)
      },
    ],
  ],
  update: (c, enemy) =>
    try_to_hit(c, enemy, {
      damage: 5,
      hitstun: 15,
      blockstun: 5,
      freeze: 5,
      block_freeze: 3,
      pushback: 5,
      block_meter_gain: 2,
      hit_meter_gain: 6,
    }),
})

Object.assign(low_punch_state, {
  init: (c) => {
    c.current_anim = { ...low_punch }
    c.can_hit = true
  },
  transitions: [
    [
      (c) => wants_to_dash(c) && c.can_hit == false && c.meter >= 50,
      dash_cancel,
    ],

    [
      (c) => c.state_time >= 35,
      (c) => {
        c.recovery = 12
        c.crouching_recovery = true
        set_state(c, recovery_state)
      },
    ],
  ],
  update: (c, enemy) => {
    if (c.state_time == 23) {
      c.x += 10 * (c.right_side ? -1 : 1)
    }
    if (c.state_time > 20) {
      c.current_anim.speed = 4
      try_to_hit(c, enemy, {
        knockdown: true,
        damage: 8,
        hitstun: 24,
        blockstun: 3,
        freeze: 8,
        block_freeze: 5,
        pushback: 8,
        block_meter_gain: 4,
        hit_meter_gain: 8,
      })
    }
  },
})

Object.assign(shoot_state, {
  init: (c) => {
    c.fast_bullet = holding_forward(c)
    c.current_anim = c.fast_bullet ? shoot_fast : shoot_slow
  },
  transitions: [
    [
      (c) =>
        wants_to_dash(c) &&
        c.state_time >= (c.fast_bullet ? 15 : 25) &&
        c.meter >= 50,
      dash_cancel,
    ],
    [
      (c) => c.state_time >= 30,
      (c) => {
        c.recovery = c.fast_bullet ? 8 : 15
        set_state(c, recovery_state)
      },
    ],
  ],
  update: (c, enemy) => {
    if (c.state_time == (c.fast_bullet ? 15 : 25)) {
      add_meter(c, 3)
      fire_bullet(c, enemy, c.x + SPRITE_SIZE / 2, c.y, c.right_side ? -1 : 1, {
        single: true,
        lifetime: c.fast_bullet ? 100 : 60,
        sheet: c.sheet,
        damage: 20,
        speed: c.fast_bullet
          ? (t) => Math.min(3, 1.5 + t * 0.2) * 0.75
          : (t) => Math.min(3, 1.5 + t * 0.2) * 0.4,
        spawn_point: [-32, -10],
        current_anim: bullet,
        //
        damage: 5,
        hitstun: 15,
        blockstun: 5,
        freeze: 5,
        block_freeze: 3,
        pushback: 5,
        block_meter_gain: 4,
        hit_meter_gain: 8,
      })
    }
  },
})

Object.assign(kick_state, {
  init: (c) => {
    c.current_anim = kick
    c.can_hit = true
  },
  transitions: [
    [
      (c) => c.state_time >= 20,
      (c) => {
        c.recovery = 20
        set_state(c, recovery_state)
      },
    ],

    [
      (c) => wants_to_dash(c) && c.can_hit == false && c.meter >= 50,
      dash_cancel,
    ],
  ],
  update: (c, enemy) => {
    if (c.state_time >= 10 && c.state_time < 15) {
      c.x += 3 * (c.right_side ? -1 : 1)
    }

    try_to_hit(c, enemy, {
      damage: 13,
      hitstun: 25,
      blockstun: 10,
      freeze: 10,
      block_freeze: 7,
      pushback: 10,
      block_meter_gain: 6,
      hit_meter_gain: 12,
    })
  },
})

const land_transition = [
  (c) => c.y >= GROUND_Y,
  (c) => {
    c.y = GROUND_Y
    set_state(c, idle_state)
  },
]

Object.assign(jump_kick_state, {
  init: (c) => {
    c.current_anim = jump_kick
    c.can_hit = true
  },
  transitions: [land_transition],
  update: (c, enemy) => {
    try_to_hit(c, enemy, {
      damage: 13,
      hitstun: 20,
      blockstun: 14,
      freeze: 8,
      block_freeze: 5,
      pushback: 6,
      block_meter_gain: 3,
      hit_meter_gain: 7,
    })

    c.x += c.jump_direction
    c.time_since_left_ground++
    if (c.time_since_left_ground < 10) {
      c.y -= 4
    } else if (c.time_since_left_ground < 20) {
      c.y -= 1
    } else {
      c.y += Math.floor(c.fall_speed)
      c.fall_speed += 0.4
    }
  },
})

Object.assign(recovery_state, {
  init: (c) =>
    (c.current_anim = c.crouching_recovery ? crouching_recovery : recovery),
  exit: (c) => (c.crouching_recovery = false),
  transitions: [
    [(c) => c.recovery <= 0 && c.crouching_recovery, crouch_state],
    [(c) => c.recovery <= 0, idle_state],
    [(c) => wants_to_dash(c) && c.recovery > 4 && c.meter >= 50, dash_cancel],
  ],
  update: (c) => {
    c.recovery--
  },
})

export const is_grounded = (c) => c.y >= GROUND_Y

Object.assign(hitstun_state, {
  init: (c) => {
    if (is_grounded(c)) {
      c.current_anim = standing_damage
    } else {
      c.current_anim = jumping_damage
      c.pushback = Math.max(c.pushback, 8)
    }
  },
  exit: (c) => (c.y_pushback = 0),
  transitions: [
    [(c) => c.hitstun <= 0 && c.y < GROUND_Y, fall_state],
    [(c) => c.hitstun <= 0, idle_state],
  ],
  update: (c, enemy) => {
    c.x += c.pushback * 0.2 * (c.right_side ? 1 : -1)
    c.y -= c.y_pushback * 0.2
    if (c.x >= RIGHT_SIDE || c.x <= LEFT_SIDE) {
      enemy.x += c.pushback * 0.2 * (enemy.right_side ? 1 : -1) * 0.5
    }

    c.y_pushback *= 0.9

    if (c.y_pushback <= 0.1) {
      c.y_pushback = 0
    }

    if (!is_grounded(c)) {
      c.y -= 1
      c.pushback *= 0.97
      console.log(c.pushback)
    } else {
      c.pushback *= 0.9
    }

    if (c.state_time >= 1) {
      c.state_time = 2
    }
    c.hitstun--
  },
})

Object.assign(blockstun_state, {
  init: (c) => (c.current_anim = standing_block),
  transitions: [[(c) => c.blockstun <= 0, idle_state]],
  update: (c, enemy) => {
    c.x += c.pushback * 0.2 * (c.right_side ? 1 : -1)
    if (c.x >= RIGHT_SIDE || c.x <= LEFT_SIDE) {
      enemy.x += c.pushback * 0.2 * (enemy.right_side ? 1 : -1)
    }
    c.pushback *= 0.9

    if (c.state_time >= 1) {
      c.state_time = 1
    }
    c.blockstun--
  },
})

Object.assign(fall_state, {
  init: (c) => {
    c.current_anim = jump
    c.fall_speed = 1
  },
  transitions: [land_transition],
  update: (c) => {
    c.time_since_left_ground++
    c.y += Math.floor(c.fall_speed)
    c.fall_speed += 0.4
  },
})

Object.assign(jump_state, {
  init: (c) => {
    c.jump_direction = c.intent.walk_direction
    c.current_anim = jump
    c.time_since_left_ground = 0
    c.fall_speed = 1
  },
  exit: (c) => (c.momentum = 1),
  transitions: [
    land_transition,
    [(c) => wants_to_punch(c) || wants_to_kick(c), jump_kick_state],
  ],
  update: (c) => {
    c.x += c.jump_direction * 1.5 * c.momentum
    c.time_since_left_ground++
    if (c.time_since_left_ground < 12) {
      c.y -= 4
    } else if (c.time_since_left_ground < 14) {
      c.y -= 2
    } else if (c.time_since_left_ground < 20) {
      c.y -= 1
    } else {
      c.y += Math.floor(c.fall_speed)
      c.fall_speed += 0.4
    }
  },
})

Object.assign(idle_state, {
  init: (c) => (c.current_anim = idle),
  transitions: [
    [(c) => c.hp <= 0, knocked_out_state],
    [wants_to_jump, jump_state],
    [wants_to_punch, punch_state],
    [wants_to_shoot, shoot_state],
    [wants_to_kick, kick_state],
    [wants_to_crouch, crouch_state],
    [wants_to_dash, dash_state],
    [(c) => c.intent.walk_direction != 0, walk_state],
  ],
})

Object.assign(walk_state, {
  init: (c) => (c.current_anim = walk),
  exit: (c) => (c.blocking = false),
  transitions: [
    [wants_to_jump, jump_state],
    [wants_to_punch, punch_state],
    [wants_to_shoot, shoot_state],
    [wants_to_kick, kick_state],
    [wants_to_crouch, crouch_state],
    [wants_to_dash, dash_state],
    [(c) => c.intent.walk_direction === 0, idle_state],
  ],
  update: (c) => {
    const walking_away =
      (c.intent.walk_direction > 0 && c.right_side) ||
      (c.intent.walk_direction < 0 && !c.right_side)
    c.x += walking_away
      ? c.intent.walk_direction * 0.5
      : c.intent.walk_direction * 1
    c.blocking = walking_away
  },
})

const dash_time = 22

Object.assign(dash_state, {
  init: (c) => {
    var forward_dash =
      c.intent.walk_direction == 0 ||
      c.intent.walk_direction == (c.right_side ? -1 : 1)
    c.current_anim = forward_dash ? dash : backdash
    c.dash_direction = (forward_dash ? 1 : -1) * (c.right_side ? -1 : 1)
  },
  exit: (c) => {
    c.blocking = false
    c.y = GROUND_Y
  },
  transitions: [
    [
      wants_to_jump,
      (c) => {
        if (c.current_anim == dash && holding_forward(c)) {
          c.momentum =
            1 +
            Math.max(
              -0.5,
              c.state_time < 15
                ? c.state_time * 0.06
                : (15 - c.state_time) * 0.06
            )
        }
        set_state(c, jump_state)
      },
    ],
    //[wants_to_punch, punch_state],
    //[wants_to_shoot, shoot_state],
    //[wants_to_kick, kick_state],
    [wants_to_crouch, crouch_state],
    [(c) => c.state_time > dash_time, idle_state],
  ],
  update: (c) => {
    c.x +=
      c.dash_direction * (0.5 + (3.5 * (dash_time - c.state_time)) / dash_time)
    if (c.state_time < dash_time * 0.75) {
      c.y -= 0.2
    } else {
      c.y += 0.3
    }
  },
})

export const create = ({ x, y, meter, current_anim, sheet, key } = {}) => {
  current_anim = current_anim || idle
  y = y || GROUND_Y
  meter = meter || 0
  console.assert(x, "need x")
  console.assert(current_anim, "need current_anim")
  console.assert(current_anim, "need key")
  return {
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
    state: idle_state,
    state_time: 0,
    hp: 120,
    max_hp: 120,
    x,
    y,
    current_anim: current_anim,
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
