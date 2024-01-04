import { sprite, frame } from "./render.js"
import { hits, overlap } from "./physics.js"

const idle = { row: 0, len: 2, speed: 10 }
const walk = { row: 1, len: 2, speed: 10 }
const punch = { row: 2, len: 4, speed: 2 }
const crouch = { row: 4, len: 1, speed: 10 }
const standing_damage = { row: 5, len: 2, speed: 10 }

export const create = ({ x, y, current_anim, sheet, key } = {}) => {
  current_anim = current_anim || idle
  console.assert(x, "need x")
  console.assert(y), "need y"
  console.assert(current_anim, "need current_anim")
  console.assert(current_anim, "need key")
  return {
    can_hit: false,
    x,
    y,
    current_anim: current_anim,
    punching: false,
    wasPunching: false,
    walking: 0,
    wasWalking: true,
    wrouching: false,
    wasCrouching: false,
    i: 0,
    key,
    flipped: false,
  }
}

export const draw = (c) => {
  frame(
    c.sheet,
    c.x,
    c.y,
    ...sprite(c.current_anim, Math.floor(c.i / c.current_anim.speed)),
    { flipped: c.flipped }
  )
}

export const key = (c, keyCode) => {
  if (keyCode == c.key.punch) {
    c.punching = true
  } else if (keyCode == c.key.crouch) {
    c.crouching = true
  } else if (keyCode == c.key.left) {
    c.walking -= 1
  } else if (keyCode == c.key.right) {
    c.walking += 1
  } else {
    // console.log("unused:", keyCode)
  }
}

export const key_up = (c, keyCode) => {
  if (keyCode == c.key.left) {
    c.walking += 1
  } else if (keyCode == c.key.right) {
    c.walking -= 1
  } else if (keyCode == c.key.crouch) {
    c.crouching = false
  }
}

export const update = (c, enemy, flipped) => {
  if (!c.wasPunching && c.punching) {
    c.current_anim = punch
    c.can_hit = true
    c.wasPunching = true
    c.wasWalking = false
    c.i = 0
  }

  if (!c.wasPunching && !c.wasWalking && c.walking) {
    c.wasWalking = true
    c.current_anim = walk
    c.i = 0
  }

  if (!c.wasPunching && !c.wasCrouching && c.crouching) {
    c.wasWalking = false
    c.wasCrouching = true
    c.i = 0
  }

  if (c.wasCrouching && !c.crouching) {
    c.current_anim = idle
    c.wasCrouching = false
    c.i = 0
  }

  if (c.wasCrouching) {
    c.current_anim = crouch
    c.wasWalking = false
  }

  if (c.wasWalking) {
    c.current_anim = walk
  }

  if (!c.wasPunching && c.walking && c.wasWalking) {
    c.x += c.walking
  }

  if (c.wasWalking && !c.walking) {
    c.current_anim = idle
    c.wasWalking = false
    c.i = 0
  }

  /////////////

  if (c.current_anim == punch && c.can_hit) {
    var [px, py] = sprite(
      c.current_anim,
      Math.floor(c.i / c.current_anim.speed)
    )
    py += 1

    const hs = hits(c.sheet, px, py, { flipped: c.flipped })
    hs.forEach(([ohx, ohy]) => {
      if (c.can_hit && overlap(c, enemy, ohx, ohy)) {
        // log("px", sprites.character.get(hx, hy))
        enemy.current_anim = standing_damage
        enemy.i = 10
        console.log("HIT")
        c.can_hit = false
        freeze(5)
      }
    })
  } else {
    if (enemy.current_anim != punch) {
      const hs = hits(
        c.sheet,
        ...sprite(c.current_anim, Math.floor(c.i / c.current_anim.speed)),
        { flipped: c.flipped }
      )

      for (var [x, y] of hs) {
        while (overlap(c, enemy, x, y)) {
          enemy.x += enemy.flipped ? 1 : -1
          break
        }
      }
    }
  }

  ////////////////

  c.i++
  // TODO: set some flag true when hit opponent
  /*
  if (enemy_anim == standing_damage) {
    enemy_x += (20 - i2) * 0.1
    x -= (20 - i2) * 0.05
  }
  */

  if (c.current_anim == standing_damage) {
    c.x += (20 - c.i) * 0.1 * c.flipped ? 1 : -1
  }

  if (
    c.current_anim == standing_damage &&
    c.i >= c.current_anim.len * c.current_anim.speed
  ) {
    c.i = 0
    c.current_anim = idle
  }

  if (c.i >= c.current_anim.len * c.current_anim.speed) {
    c.i = 0
    if (c.wasPunching) {
      c.current_anim = idle
      c.punching = false
      c.wasPunching = false
    }
  }
}
