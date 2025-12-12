/**
 * 工作流图结构工具
 * 提供图遍历、节点查找等功能
 */

import { NodeType } from '../types'

/** 图中使用的边类型（兼容数据库存储格式） */
export interface GraphEdge {
  id: string
  type: 'normal' | 'condition'
  source: string
  target: string
  condition?: string
  source_handle?: string
  target_handle?: string
}

/** 图中使用的节点类型（兼容数据库存储格式） */
export interface GraphNode {
  id: string
  type: string
  name: string
  position?: { x: number; y: number }
  execMode: 'sync' | 'async'
  config: Record<string, unknown>
}

/**
 * 工作流图结构类
 */
export class WorkflowGraph {
  private nodeMap: Map<string, GraphNode>
  private outEdges: Map<string, GraphEdge[]> // nodeId -> 出边
  private inEdges: Map<string, GraphEdge[]> // nodeId -> 入边

  constructor(
    public readonly nodes: GraphNode[],
    public readonly edges: GraphEdge[]
  ) {
    this.nodeMap = new Map()
    this.outEdges = new Map()
    this.inEdges = new Map()

    // 构建节点映射
    for (const node of nodes) {
      this.nodeMap.set(node.id, node)
      this.outEdges.set(node.id, [])
      this.inEdges.set(node.id, [])
    }

    // 构建边映射
    for (const edge of edges) {
      const outList = this.outEdges.get(edge.source)
      if (outList) {
        outList.push(edge)
      }

      const inList = this.inEdges.get(edge.target)
      if (inList) {
        inList.push(edge)
      }
    }
  }

  /**
   * 获取节点
   */
  getNode(nodeId: string): GraphNode | undefined {
    return this.nodeMap.get(nodeId)
  }

  /**
   * 获取所有起始节点（没有入边的节点，包括 START 类型节点）
   */
  getStartNodes(): GraphNode[] {
    const startNodes: GraphNode[] = []

    for (const node of this.nodes) {
      const inEdgeList = this.inEdges.get(node.id) || []

      // START 类型节点一定是起始节点
      if (node.type === NodeType.START) {
        startNodes.push(node)
      } else if (inEdgeList.length === 0) {
        // 没有入边的节点也是起始节点（孤立节点或者其他起始点）
        startNodes.push(node)
      }
    }

    return startNodes
  }

  /**
   * 获取所有孤立节点（没有入边也没有出边的节点）
   */
  getIsolatedNodes(): GraphNode[] {
    const isolated: GraphNode[] = []

    for (const node of this.nodes) {
      const inEdgeList = this.inEdges.get(node.id) || []
      const outEdgeList = this.outEdges.get(node.id) || []

      if (inEdgeList.length === 0 && outEdgeList.length === 0) {
        isolated.push(node)
      }
    }

    return isolated
  }

  /**
   * 获取节点的后继节点
   */
  getSuccessors(nodeId: string): GraphNode[] {
    const outEdgeList = this.outEdges.get(nodeId) || []
    const successors: GraphNode[] = []

    for (const edge of outEdgeList) {
      const targetNode = this.nodeMap.get(edge.target)
      if (targetNode) {
        successors.push(targetNode)
      }
    }

    return successors
  }

  /**
   * 获取节点的前驱节点
   */
  getPredecessors(nodeId: string): GraphNode[] {
    const inEdgeList = this.inEdges.get(nodeId) || []
    const predecessors: GraphNode[] = []

    for (const edge of inEdgeList) {
      const sourceNode = this.nodeMap.get(edge.source)
      if (sourceNode) {
        predecessors.push(sourceNode)
      }
    }

    return predecessors
  }

  /**
   * 获取两个节点之间的边
   */
  getEdge(sourceId: string, targetId: string): GraphEdge | undefined {
    const outEdgeList = this.outEdges.get(sourceId) || []
    return outEdgeList.find((edge) => edge.target === targetId)
  }

  /**
   * 获取节点的所有出边
   */
  getOutEdges(nodeId: string): GraphEdge[] {
    return this.outEdges.get(nodeId) || []
  }

  /**
   * 获取节点的所有入边
   */
  getInEdges(nodeId: string): GraphEdge[] {
    return this.inEdges.get(nodeId) || []
  }

  /**
   * 检查边是否为条件边
   */
  isConditionEdge(edge: GraphEdge): boolean {
    return edge.type === 'condition' && !!edge.condition
  }

  /**
   * 判断节点是否为终止节点（END 类型或没有出边）
   */
  isEndNode(nodeId: string): boolean {
    const node = this.nodeMap.get(nodeId)
    if (!node) return false

    if (node.type === NodeType.END) return true

    const outEdgeList = this.outEdges.get(nodeId) || []
    return outEdgeList.length === 0
  }

  /**
   * 从指定节点开始，获取可达的所有节点（BFS）
   */
  getReachableNodes(startNodeIds: string[]): Set<string> {
    const reachable = new Set<string>()
    const queue = [...startNodeIds]

    while (queue.length > 0) {
      const nodeId = queue.shift()!
      if (reachable.has(nodeId)) continue

      reachable.add(nodeId)

      const successors = this.getSuccessors(nodeId)
      for (const successor of successors) {
        if (!reachable.has(successor.id)) {
          queue.push(successor.id)
        }
      }
    }

    return reachable
  }

  /**
   * 根据执行模式获取需要执行的起始节点
   */
  getExecutionStartNodes(
    execMode: 'all' | 'specified_starts' | 'isolated_nodes',
    specifiedNodeIds?: string[]
  ): GraphNode[] {
    switch (execMode) {
      case 'all':
        // 执行所有起始节点（包括孤立节点）
        return this.getStartNodes()

      case 'specified_starts':
        // 只执行指定的节点
        if (!specifiedNodeIds || specifiedNodeIds.length === 0) {
          return []
        }
        return specifiedNodeIds
          .map((id) => this.nodeMap.get(id))
          .filter((node): node is GraphNode => node !== undefined)

      case 'isolated_nodes':
        // 只执行孤立节点
        if (specifiedNodeIds && specifiedNodeIds.length > 0) {
          // 指定了具体的孤立节点
          return specifiedNodeIds
            .map((id) => this.nodeMap.get(id))
            .filter((node): node is GraphNode => node !== undefined)
        }
        return this.getIsolatedNodes()

      default:
        return []
    }
  }

  /**
   * 检测环路（返回 true 表示有环）
   */
  hasCycle(): boolean {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId)
      recursionStack.add(nodeId)

      const successors = this.getSuccessors(nodeId)
      for (const successor of successors) {
        if (!visited.has(successor.id)) {
          if (dfs(successor.id)) return true
        } else if (recursionStack.has(successor.id)) {
          return true
        }
      }

      recursionStack.delete(nodeId)
      return false
    }

    for (const node of this.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true
      }
    }

    return false
  }

  /**
   * 拓扑排序（返回 null 表示有环）
   */
  topologicalSort(): GraphNode[] | null {
    const inDegree = new Map<string, number>()
    const result: GraphNode[] = []

    // 计算入度
    for (const node of this.nodes) {
      inDegree.set(node.id, 0)
    }
    for (const edge of this.edges) {
      const degree = inDegree.get(edge.target) || 0
      inDegree.set(edge.target, degree + 1)
    }

    // 将入度为 0 的节点加入队列
    const queue: string[] = []
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId)
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!
      const node = this.nodeMap.get(nodeId)
      if (node) {
        result.push(node)
      }

      const successors = this.getSuccessors(nodeId)
      for (const successor of successors) {
        const degree = (inDegree.get(successor.id) || 0) - 1
        inDegree.set(successor.id, degree)
        if (degree === 0) {
          queue.push(successor.id)
        }
      }
    }

    // 如果结果数量不等于节点数量，说明有环
    if (result.length !== this.nodes.length) {
      return null
    }

    return result
  }
}