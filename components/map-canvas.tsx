"use client";

import { CategoryRail } from "@/components/category-rail";
import { DetailPane } from "@/components/detail-pane";
import { DirectionEdge } from "@/components/direction-edge";
import { MapShell } from "@/components/map-shell";
import {
  ListScrollContext,
  MapHoverContext,
  ModuleNode,
  type ModuleFlowNode,
  type ModuleNodeData,
} from "@/components/module-node";
import { extensionOf } from "@/lib/map/categories";
import { buildMap, type MapEdge, type MapNode } from "@/lib/map/present";
import {
  edgeInView,
  shownFiles,
  type MapHighlight,
  type MapSelection,
} from "@/lib/map/selection";
import type { ParseResult } from "@/parser/types";
import {
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  useUpdateNodeInternals,
  type Edge,
  type NodeMouseHandler,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@xyflow/react/dist/style.css";

const nodeTypes = { module: ModuleNode };
const edgeTypes = { direction: DirectionEdge };

export function MapCanvas({ result }: { result: ParseResult }) {
  return (
    <ReactFlowProvider>
      <MapView result={result} />
    </ReactFlowProvider>
  );
}

function MapView({ result }: { result: ParseResult }) {
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [selection, setSelection] = useState<MapSelection>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<MapHighlight>(null);
  const [zoomLabel, setZoomLabel] = useState<string | null>(null);
  const zoomHide = useRef(0);
  const lastZoom = useRef<number | null>(null);
  const [fitRequest, setFitRequest] = useState<{
    zoom: number;
    ids: string[];
    token: number;
  } | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const open = useMemo(() => new Set(openIds), [openIds]);
  const pendingScroll = useRef<Record<string, number>>({});
  const scrollFrame = useRef(0);
  const [scrollTops, setScrollTops] = useState<Record<string, number>>({});
  const onListScroll = useCallback((id: string, top: number) => {
    pendingScroll.current[id] = top;
    cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = requestAnimationFrame(() => {
      const next = pendingScroll.current;
      pendingScroll.current = {};
      setScrollTops((current) => ({ ...current, ...next }));
    });
  }, []);
  const scroll = useMemo(() => new Map(Object.entries(scrollTops)), [scrollTops]);
  const model = useMemo(() => buildMap(result, open, scroll), [result, open, scroll]);
  const { fitView, getZoom } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const nodesReady = useNodesInitialized();
  const fitted = useRef(false);

  useEffect(() => {
    const read = () => {
      setTheme(
        document.documentElement.dataset.theme === "dark" ? "dark" : "light",
      );
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!nodesReady || fitted.current) return;
    fitted.current = true;
    // The first fitView runs before node boxes exist and leaves the graph tiny.
    fitView({ padding: 0.08, duration: 0, maxZoom: 1.25 });
  }, [nodesReady, fitView]);

  useEffect(() => {
    if (!fitRequest) return;
    // Measure after the opened panel sizes are in the document, not the collapsed box.
    updateNodeInternals(fitRequest.ids);
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        fitView({
          nodes: fitRequest.ids.map((nodeId) => ({ id: nodeId })),
          maxZoom: fitRequest.zoom,
          padding: 0.12,
          duration: 0,
        });
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [fitRequest, model, fitView, updateNodeInternals]);

  useEffect(() => {
    updateNodeInternals(openIds);
  }, [scrollTops, openIds, updateNodeInternals]);

  useEffect(() => () => window.clearTimeout(zoomHide.current), []);

  const actions = useMemo(
    () => ({
      openNode(id: string) {
        if (openIds.includes(id)) return;
        const next = [...openIds, id].sort();
        setOpenIds(next);
        setFitRequest({ zoom: getZoom(), ids: [id], token: Date.now() });
        setSelection({ kind: "node", id });
      },
      closeNode(id: string) {
        setOpenIds((current) => current.filter((item) => item !== id));
        setSelection((current) =>
          current?.kind === "node" && current.id === id ? null : current,
        );
      },
      selectNode(id: string) {
        setSelection((current) =>
          current?.kind === "node" && current.id === id
            ? null
            : { kind: "node", id },
        );
      },
      selectFile(path: string, nodeId: string) {
        setSelection((current) =>
          current?.kind === "file" && current.path === path
            ? { kind: "node", id: nodeId }
            : { kind: "file", path },
        );
      },
    }),
    [getZoom, openIds],
  );

  const categoryFiles = useMemo(() => {
    if (!category) return null;
    return new Set(
      result.files.filter((file) => extensionOf(file.path) === category).map((file) => file.path),
    );
  }, [category, result.files]);
  const derivedNodes = useMemo(
    () => toFlowNodes(model.nodes, selection, highlight, model.links, categoryFiles),
    [model, selection, highlight, categoryFiles],
  );
  const derivedEdges = useMemo(
    () => toFlowEdges(model.edges, selection, model.nodes, model.links, categoryFiles),
    [model, selection, categoryFiles],
  );
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(derivedNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(derivedEdges);

  useEffect(() => {
    setFlowNodes(derivedNodes);
  }, [derivedNodes, setFlowNodes]);

  useEffect(() => {
    setFlowEdges(derivedEdges);
  }, [derivedEdges, setFlowEdges]);

  const onNodeClick: NodeMouseHandler<ModuleFlowNode> = (event, node) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const file = target.closest("[data-file]");
    if (file instanceof HTMLElement && file.dataset.file) {
      actions.selectFile(file.dataset.file, node.id);
      return;
    }
    if (target.closest("[data-close]")) {
      actions.closeNode(node.id);
      return;
    }
    if (node.data.open) {
      actions.selectNode(node.id);
      return;
    }
    actions.openNode(node.id);
  };

  return (
    <ListScrollContext.Provider value={onListScroll}>
    <MapHoverContext.Provider value={setHighlight}>
      <MapShell
        rail={
          <CategoryRail
            files={result.files}
            selected={category}
            onSelect={(extension) =>
              setCategory((current) => (current === extension ? null : extension))
            }
          />
        }
        canvas={
          <div className="absolute inset-0">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              colorMode={theme}
              onNodeClick={onNodeClick}
              onNodeMouseLeave={() => setHighlight(null)}
              onMove={(event, viewport) => {
                if (!event || viewport.zoom === lastZoom.current) return;
                lastZoom.current = viewport.zoom;
                setZoomLabel(`${Math.round(viewport.zoom * 100)}%`);
                window.clearTimeout(zoomHide.current);
                zoomHide.current = window.setTimeout(() => setZoomLabel(null), 800);
              }}
              minZoom={0.15}
              maxZoom={2}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnDrag
              panOnScroll
              zoomOnDoubleClick={false}
              noPanClassName="nopan"
              onPaneClick={() => {
                setOpenIds([]);
                setSelection(null);
                setHighlight(null);
              }}
              proOptions={{ hideAttribution: true }}
              style={{ background: "transparent" }}
            />
          </div>
        }
        zoom={zoomLabel}
        detail={
          <DetailPane
            result={result}
            selection={selection}
            highlight={highlight}
            nodes={model.nodes}
            onSelectFile={(path) => setSelection({ kind: "file", path })}
            onHoverPath={(path) =>
              setHighlight(path ? { kind: "file", path } : null)
            }
          />
        }
      />
    </MapHoverContext.Provider>
    </ListScrollContext.Provider>
  );
}

function toFlowNodes(
  nodes: readonly MapNode[],
  selection: MapSelection,
  highlight: MapHighlight,
  links: readonly { from: string; to: string }[],
  category: ReadonlySet<string> | null,
): ModuleFlowNode[] {
  const bright = shownFiles(selection, category, nodes, links);
  return nodes.map((node) => {
    const nodeBright = bright === null || node.files.some((file) => bright.has(file));
    const nodeHovered =
      (highlight?.kind === "node" && highlight.id === node.id) ||
      (highlight?.kind === "file" && node.files.includes(highlight.path));
    const data: ModuleNodeData = {
      label: node.label,
      open: node.open,
      fileCount: node.fileCount,
      fanIn: node.fanIn,
      fanOut: node.fanOut,
      dimmed: !nodeBright,
      selected: selection?.kind === "node" && selection.id === node.id,
      hovered: nodeHovered,
      matched: category === null ? null : node.files.filter((file) => category.has(file)).length,
      rows: node.rows.map((row) => ({
        path: row.path,
        label: row.label,
        fanIn: row.fanIn,
        fanOut: row.fanOut,
        height: row.height,
        color: row.color,
        dimmed: bright !== null && !bright.has(row.path),
        selected: selection?.kind === "file" && selection.path === row.path,
        hovered: highlight?.kind === "file" && highlight.path === row.path,
        placement: row.placement,
      })),
    };
    return {
      id: node.id,
      type: "module",
      position: { x: node.x, y: node.y },
      data,
      width: node.width,
      height: node.height,
      initialWidth: node.width,
      initialHeight: node.height,
      style: {
        width: node.width,
        height: node.height,
        // React Flow drops pointer events when a node is neither draggable nor
        // selectable and no node click handler is registered. Clicks have to land.
        pointerEvents: "all",
      },
      draggable: false,
      connectable: false,
      selectable: false,
      zIndex: node.open ? 2 : 1,
    };
  });
}

function toFlowEdges(
  edges: readonly MapEdge[],
  selection: MapSelection,
  nodes: readonly MapNode[],
  links: readonly { from: string; to: string }[],
  category: ReadonlySet<string> | null,
): Edge[] {
  const bright = shownFiles(selection, category, nodes, links);
  return edges.map((edge) => {
    const lit = edgeInView(edge, selection, bright, category);
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: "direction",
      data: { colored: selection !== null && lit },
      style: {
        opacity: lit ? 1 : 0.08,
      },
    };
  });
}
