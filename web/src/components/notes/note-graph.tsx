"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MiniMap,
  Controls,
  Background,
} from "reactflow";
import "reactflow/dist/style.css";
import { useQuery } from "@tanstack/react-query";

export function NoteGraph() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["notes-graph"],
    queryFn: async () => {
      const res = await fetch("/api/v1/notes/graph");
      return res.json() as Promise<{
        nodes: { id: string; label: string }[];
        edges: { source: string; target: string }[];
      }>;
    },
  });

  const initialNodes: Node[] = (data?.nodes ?? []).map((n, i) => ({
    id: n.id,
    data: { label: n.label },
    position: {
      x: Math.cos((2 * Math.PI * i) / (data?.nodes.length ?? 1)) * 300 + 400,
      y: Math.sin((2 * Math.PI * i) / (data?.nodes.length ?? 1)) * 300 + 300,
    },
    style: {
      background: "#d97706",
      color: "white",
      border: "none",
      borderRadius: "8px",
      padding: "8px 12px",
      fontSize: "12px",
    },
  }));

  const initialEdges: Edge[] = (data?.edges ?? []).map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    animated: true,
    style: { stroke: "#d97706" },
  }));

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      router.push(`/notes/${node.id}`);
    },
    [router]
  );

  if (isLoading) return <p className="p-4 text-gray-500">Loading graph...</p>;
  if (!data?.nodes.length) return <p className="p-4 text-gray-500">No linked notes yet.</p>;

  return (
    <div className="h-[500px] w-full rounded" style={{ border: "1px solid var(--border)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background />
      </ReactFlow>
    </div>
  );
}
