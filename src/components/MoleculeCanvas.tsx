import { useRef } from "react";
import { Editor } from "ketcher-react";
import { StandaloneStructServiceProvider } from "ketcher-standalone";
import type { Ketcher } from "ketcher-core";
import "ketcher-react/dist/index.css";

const structServiceProvider = new StandaloneStructServiceProvider();

export function MoleculeCanvas({ onReady }: { onReady?: (k: Ketcher) => void }) {
  const ketcherRef = useRef<Ketcher | null>(null);

  return (
    <div className="h-[600px] w-full">
      <Editor
        staticResourcesUrl=""
        structServiceProvider={structServiceProvider}
        errorHandler={(message: string) => console.error("[ketcher]", message)}
        onInit={(ketcher: Ketcher) => {
          ketcherRef.current = ketcher;
          onReady?.(ketcher);
        }}
      />
    </div>
  );
}
