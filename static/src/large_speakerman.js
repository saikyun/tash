import * as ch from "./character.js"

// TODO: fix what can cancel into each other
// state machine??? :O

// intent (from controller, e.g. jump or punch)
// handle intent (depends on state)
// update
// render / maybe just set data pertaining to rendering

import { sprite, frame } from "./render.js"
import { hits, overlap } from "./physics.js"

// export const idle = { row: 0, len: 2, speed: 10 }
// export const walk = { row: 1, len: 2, speed: 10 }
// export const punch = { row: 2, len: 4, speed: 2 }
// export const crouch = { row: 4, len: 1, speed: 10 }
// export const standing_damage = { row: 5, len: 2, speed: 1 }
// export const jump = { row: 6, len: 1, speed: 10 }
// export const jump_kick = { row: 7, len: 1, speed: 10 }
// export const jumping_damage = { row: 9, len: 1, speed: 10 }
// export const standing_block = { row: 10, len: 1, speed: 10 }
// export const knocked_out = { row: 11, len: 2, speed: 10 }
// export const kick = { row: 12, len: 4, speed: 5 }

export const idle = { row: 0, len: 2, speed: 10 }
export const walk = { row: 1, len: 2, speed: 10 }
export const punch = { row: 2, len: 2, speed: 2 }
export const crouch = { row: 4, len: 1, speed: 10 }
export const standing_damage = { row: 5, len: 2, speed: 1 }
export const jump = { row: 6, len: 1, speed: 10 }
export const jump_kick = { row: 7, len: 1, speed: 10 }
export const jumping_damage = { row: 9, len: 1, speed: 10 }
export const standing_block = { row: 10, len: 1, speed: 10 }
export const knocked_out = { row: 11, len: 3, speed: 10 }
export const kick = { row: 12, len: 4, speed: 5 }
export const recovery = { row: 14, len: 1, speed: 5 }
export const shoot_fast = { row: 15, len: 2, speed: 13 }
export const shoot_slow = { row: 15, len: 2, speed: 18 }
export const bullet = { row: 16, len: 5, speed: 4 }
export const bullet_hit = { row: 18, len: 1, speed: 4 }
export const dash = { row: 19, len: 1, speed: 4 }
export const backdash = { row: 20, len: 1, speed: 4 }
export const low_punch = { row: 21, len: 5, speed: 25 }
export const crouching_recovery = { row: 23, len: 1, speed: 5 }

export const jump_state = {}
export const fall_state = {}
export const crouch_state = {}
export const idle_state = {}
export const walk_state = {}
export const punch_state = {}
export const low_punch_state = {}
export const recovery_state = {}
export const hitstun_state = {}
export const blockstun_state = {}
export const jump_kick_state = {}
export const win_state = {}
export const knocked_out_state = {}
export const kick_state = {}
export const dash_state = {}
export const shoot_state = {}

export const specific_data = () => ({
  dash_state: dash_state,
  hitstun_state: hitstun_state,
  blockstun_state: blockstun_state,
  win_state: win_state,
  state: idle_state,
  current_anim: idle,
})

const land_transition = [
  (c) => c.y >= ch.GROUND_Y,
  (c) => {
    c.y = ch.GROUND_Y
    ch.set_state(c, idle_state)
  },
]

const bullet_hit_data = (sheet) => ({
  sheet: sheet,
  speed: (t) => 0,
  spawn_point: [0, 0],
  current_anim: bullet_hit,
  lifetime: 20,
})

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
    [ch.wants_to_punch, low_punch_state],
  ],
})

Object.assign(punch_state, {
  init: (c) => {
    c.current_anim = punch
    c.can_hit = true
  },
  transitions: [
    [(c) => ch.wants_to_shoot(c) && c.can_hit == false, shoot_state],
    [
      (c) => ch.wants_to_dash(c) && c.can_hit == false && c.meter >= 50,
      ch.dash_cancel,
    ],
    [
      (c) => c.state_time >= 5,
      (c) => {
        c.recovery = 8
        ch.set_state(c, recovery_state)
      },
    ],
  ],
  update: (c, enemy) =>
    ch.try_to_hit(c, enemy, {
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
      (c) => ch.wants_to_dash(c) && c.can_hit == false && c.meter >= 50,
      ch.dash_cancel,
    ],

    [
      (c) => c.state_time >= 35,
      (c) => {
        c.recovery = 12
        c.crouching_recovery = true
        ch.set_state(c, recovery_state)
      },
    ],
  ],
  update: (c, enemy) => {
    if (c.state_time == 23) {
      c.x += 10 * (c.right_side ? -1 : 1)
    }
    if (c.state_time > 20) {
      c.current_anim.speed = 4
      ch.try_to_hit(c, enemy, {
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
    c.fast_bullet = ch.holding_forward(c)
    c.current_anim = c.fast_bullet ? shoot_fast : shoot_slow
  },
  transitions: [
    [
      (c) =>
        ch.wants_to_dash(c) &&
        c.state_time >= (c.fast_bullet ? 15 : 25) &&
        c.meter >= 50,
      ch.dash_cancel,
    ],
    [
      (c) => c.state_time >= 30,
      (c) => {
        c.recovery = c.fast_bullet ? 8 : 15
        ch.set_state(c, recovery_state)
      },
    ],
  ],
  update: (c, enemy) => {
    if (c.state_time == (c.fast_bullet ? 15 : 25)) {
      ch.add_meter(c, 3)
      ch.fire_bullet(
        c,
        enemy,
        c.x + SPRITE_SIZE / 2,
        c.y,
        c.right_side ? -1 : 1,
        {
          on_hit: (bullet) =>
            ch.fire_bullet(
              bullet.shooter,
              bullet.enemy,
              bullet.x,
              bullet.y,
              bullet.direction,
              bullet_hit_data(bullet.sheet)
            ),
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
        }
      )
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
        ch.set_state(c, recovery_state)
      },
    ],

    [
      (c) => ch.wants_to_dash(c) && c.can_hit == false && c.meter >= 50,
      ch.dash_cancel,
    ],
  ],
  update: (c, enemy) => {
    if (c.state_time >= 10 && c.state_time < 15) {
      c.x += 3 * (c.right_side ? -1 : 1)
    }

    ch.try_to_hit(c, enemy, {
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

Object.assign(jump_kick_state, {
  init: (c) => {
    c.current_anim = jump_kick
    c.can_hit = true
  },
  transitions: [land_transition],
  update: (c, enemy) => {
    ch.try_to_hit(c, enemy, {
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
    [
      (c) => ch.wants_to_dash(c) && c.recovery > 4 && c.meter >= 50,
      ch.dash_cancel,
    ],
  ],
  update: (c) => {
    c.recovery--
  },
})

Object.assign(hitstun_state, {
  init: (c) => {
    if (ch.is_grounded(c)) {
      c.current_anim = standing_damage
    } else {
      c.current_anim = jumping_damage
      c.pushback = Math.max(c.pushback, 8)
    }
  },
  exit: (c) => (c.y_pushback = 0),
  transitions: [
    [(c) => c.hitstun <= 0 && c.y < ch.GROUND_Y, fall_state],
    [(c) => c.hitstun <= 0, idle_state],
  ],
  update: (c, enemy) => {
    c.x += c.pushback * 0.2 * (c.right_side ? 1 : -1)
    c.y -= c.y_pushback * 0.2
    if (c.x >= ch.RIGHT_SIDE || c.x <= ch.LEFT_SIDE) {
      enemy.x += c.pushback * 0.2 * (enemy.right_side ? 1 : -1) * 0.5
    }

    c.y_pushback *= 0.9

    if (c.y_pushback <= 0.1) {
      c.y_pushback = 0
    }

    if (!ch.is_grounded(c)) {
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
  init: (c) => {
    c.current_anim = standing_block
    c.blocking = true
  },
  exit: (c) => {
    c.blocking = false
  },
  transitions: [[(c) => c.blockstun <= 0, idle_state]],
  update: (c, enemy) => {
    c.x += c.pushback * 0.2 * (c.right_side ? 1 : -1)
    if (c.x >= ch.RIGHT_SIDE || c.x <= ch.LEFT_SIDE) {
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
    [(c) => ch.wants_to_punch(c) || ch.wants_to_kick(c), jump_kick_state],
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
    [ch.wants_to_jump, jump_state],
    [ch.wants_to_punch, punch_state],
    [ch.wants_to_shoot, shoot_state],
    [ch.wants_to_kick, kick_state],
    [ch.wants_to_crouch, crouch_state],
    [ch.wants_to_dash, dash_state],
    [(c) => c.intent.walk_direction != 0, walk_state],
  ],
  update: (c) => {
    const walking_away =
      (c.intent.walk_direction > 0 && c.right_side) ||
      (c.intent.walk_direction < 0 && !c.right_side)
    c.blocking = walking_away
  },
})

Object.assign(walk_state, {
  init: (c) => (c.current_anim = walk),
  exit: (c) => (c.blocking = false),
  transitions: [
    [ch.wants_to_jump, jump_state],
    [ch.wants_to_punch, punch_state],
    [ch.wants_to_shoot, shoot_state],
    [ch.wants_to_kick, kick_state],
    [ch.wants_to_crouch, crouch_state],
    [ch.wants_to_dash, dash_state],
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
    c.y = ch.GROUND_Y
  },
  transitions: [
    [
      ch.wants_to_jump,
      (c) => {
        if (c.current_anim == dash && ch.holding_forward(c)) {
          c.momentum =
            1 +
            Math.max(
              -0.5,
              c.state_time < 15
                ? c.state_time * 0.06
                : (15 - c.state_time) * 0.06
            )
        }
        ch.set_state(c, jump_state)
      },
    ],
    //[ch.wants_to_punch, punch_state],
    //[ch.wants_to_shoot, shoot_state],
    //[ch.wants_to_kick, kick_state],
    [ch.wants_to_crouch, crouch_state],
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
