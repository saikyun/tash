// TODO: fix what can cancel into each other
// state machine??? :O

// intent (from controller, e.g. jump or punch)
// handle intent (depends on state)
// update
// render / maybe just set data pertaining to rendering

import { sprite, frame } from "./render.js"
import { hits, overlap } from "./physics.js"

export const GROUND_Y = 150
export const RIGHT_SIDE = 300
export const LEFT_SIDE = 10

const idle = { row: 0, len: 2, speed: 10 }
const walk = { row: 1, len: 2, speed: 10 }
const punch = { row: 2, len: 4, speed: 2 }
const crouch = { row: 4, len: 1, speed: 10 }
const standing_damage = { row: 5, len: 2, speed: 1 }
const jump = { row: 6, len: 1, speed: 10 }
const jump_kick = { row: 7, len: 1, speed: 10 }
const jumping_damage = { row: 9, len: 1, speed: 10 }
const standing_block = { row: 10, len: 1, speed: 10 }
const knocked_out = { row: 11, len: 2, speed: 10 }

const wants_to_jump = (c) => c.intent.jump
const wants_to_crouch = (c) => c.intent.crouch
// 3 frame buffer
const wants_to_punch = (c) => c.held_intent.punch < 3 && c.intent.punch

const set_state = (c, state) => {
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
const recovery_state = {}
const hitstun_state = {}
const blockstun_state = {}
const jump_kick_state = {}
const win_state = {}
const knocked_out_state = {}

Object.assign(knocked_out_state, {
  init: (c) => (c.current_anim = knocked_out),
  update: (c) => (c.state_time > 11 ? (c.state_time = 11) : null),
})

Object.assign(win_state, {
  init: (c) => (c.current_anim = idle),
})

Object.assign(crouch_state, {
  init: (c) => (c.current_anim = crouch),
  transitions: [[(c) => c.intent.crouch !== true, idle_state]],
})

const which_frame = (c) =>
  Math.floor((c.state_time / c.current_anim.speed) % c.current_anim.len)

const try_to_hit = (c, enemy, atk_data) => {
  var [px, py] = sprite(c.current_anim, which_frame(c))
  // py + 1 is the hitbox of the attack
  py += 1

  const hs = hits(c.sheet, px, py, { flipped: c.flipped })
  hs.forEach(([ohx, ohy]) => {
    if (c.can_hit && overlap(c, enemy, ohx, ohy)) {
      c.can_hit = false
      if (enemy.blocking) {
        enemy.blockstun = atk_data.blockstun
        enemy.pushback = atk_data.pushback
        set_state(enemy, blockstun_state)
        freeze(atk_data.block_freeze)
      } else {
        enemy.hitstun = atk_data.hitstun
        enemy.pushback = atk_data.pushback
        set_state(enemy, hitstun_state)
        enemy.hp -= atk_data.damage
        if (enemy.hp <= 0) {
          freeze(atk_data.freeze * 5)
          setTimeout(() => set_state(c, win_state), 1500)
        } else {
          freeze(atk_data.freeze)
        }
      }
    }
  })
}

Object.assign(punch_state, {
  init: (c) => {
    c.current_anim = punch
    c.can_hit = true
  },
  transitions: [
    [
      (c) => c.state_time >= 5,
      (c) => {
        c.recovery = 5
        set_state(c, recovery_state)
      },
    ],
  ],
  update: (c, enemy) =>
    try_to_hit(c, enemy, {
      damage: 5,
      hitstun: 10,
      blockstun: 5,
      freeze: 5,
      block_freeze: 3,
      pushback: 5,
    }),
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
  init: (c) => (c.current_anim = punch),
  transitions: [[(c) => c.recovery <= 0, idle_state]],
  update: (c) => {
    c.state_time = 0
    c.recovery--
  },
})

const is_grounded = (c) => c.y >= GROUND_Y

Object.assign(hitstun_state, {
  init: (c) =>
    is_grounded(c)
      ? (c.current_anim = standing_damage)
      : (c.current_anim = jumping_damage),
  transitions: [
    [(c) => c.hitstun <= 0 && c.y < GROUND_Y, fall_state],
    [(c) => c.hitstun <= 0, idle_state],
  ],
  update: (c, enemy) => {
    c.x += c.pushback * 0.2 * (c.right_side ? 1 : -1)
    if (c.x >= RIGHT_SIDE || c.x <= LEFT_SIDE) {
      enemy.x += c.pushback * 0.2 * (enemy.right_side ? 1 : -1)
    }
    c.pushback *= 0.9

    if (!is_grounded(c)) {
      c.y -= 1
    }

    if (c.state_time >= 1) {
      c.state_time = 1
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
  transitions: [land_transition, [wants_to_punch, jump_kick_state]],
  update: (c) => {
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

Object.assign(idle_state, {
  init: (c) => (c.current_anim = idle),
  transitions: [
    [(c) => c.hp <= 0, knocked_out_state],
    [wants_to_jump, jump_state],
    [wants_to_punch, punch_state],
    [wants_to_crouch, crouch_state],
    [(c) => c.intent.walk_direction != 0, walk_state],
  ],
})

Object.assign(walk_state, {
  init: (c) => (c.current_anim = walk),
  exit: (c) => (c.blocking = false),
  transitions: [
    [wants_to_jump, jump_state],
    [wants_to_punch, punch_state],
    [wants_to_crouch, crouch_state],
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

export const create = ({ x, y, current_anim, sheet, key } = {}) => {
  current_anim = current_anim || idle
  y = y || GROUND_Y
  console.assert(x, "need x")
  console.assert(current_anim, "need current_anim")
  console.assert(current_anim, "need key")
  return {
    can_hit: false,
    intent: { jump: false, walk_direction: 0, punch: false, restart: false },
    held_intent: { punch: 0 },
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
  frame(c.sheet, c.x, c.y, ...sprite(c.current_anim, which_frame(c)), {
    flipped: c.flipped,
  })
}

export const key = (c, keyCode) => {
  if (keyCode == c.key.punch) {
    c.intent.punch = true
  } else if (keyCode == c.key.crouch) {
    c.intent.crouch = true
  } else if (keyCode == c.key.left) {
    c.intent.walk_direction -= 1
  } else if (keyCode == c.key.right) {
    c.intent.walk_direction += 1
  } else if (keyCode == c.key.jump) {
    c.intent.jump = true
  } else if (keyCode == c.key.restart) {
    c.intent.restart = true
  } else {
    console.log("unused:", keyCode)
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
  } else if (keyCode == c.key.right) {
    c.intent.walk_direction -= 1
  } else if (keyCode == c.key.crouch) {
    c.intent.crouch = false
  } else if (keyCode == c.key.jump) {
    c.intent.jump = false
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
    if (pred(c)) {
      if (typeof action === "function") {
        action(c)
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
