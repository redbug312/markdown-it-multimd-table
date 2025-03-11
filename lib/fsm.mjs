export function Node (value) {
  return -value
}

export function Edge (value) {
  return value
}

/**
 * @typedef {object} StateMachine
 * @property {number[]} allEdges
 * @property {number} currentNode
 * @property {Set<number>} acceptNodes
 * @property {Map<number, Map<number, number>>} transitions
 */
export class StateMachine {
  constructor (highestEdge, initialNode, acceptNodes, transitions) {
    const transitionsMapped = new Map()
    for (const tuple of transitions) {
      const [from, edge, into] = tuple
      transitionsMapped[from] = transitionsMapped[from] || new Map()
      transitionsMapped[from][edge] = into
    }
    this.highestEdge = highestEdge
    this.currentNode = initialNode
    this.acceptNodes = new Set(acceptNodes)
    this.transitions = transitionsMapped
  }

  accepted () {
    return this.acceptNodes.has(this.currentNode)
  }

  next (patternMatches) {
    for (let edge = this.highestEdge; edge > 0; edge >>= 1) {
      const from = this.currentNode
      const hasTransition = (-from & edge) > 0
      if (hasTransition && patternMatches(edge)) {
        const into = this.transitions[from][edge]
        console.assert(into)
        console.log(`${toBinary(from)} --- ${toBinary(edge)} --> ${toBinary(into)}`)
        this.currentNode = into
        return edge
      }
    }
    return null
  }
}

function toBinary (value) {
  return `0b${Math.abs(value).toString(2).padStart(5, '0')}`
}
