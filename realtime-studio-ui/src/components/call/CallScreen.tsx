import { useEffect, useRef } from "react";

export function CallScreen({ mosaicFrame, onLeave }) {
  const imgRef = useRef(null);

  useEffect(() => {
    if (imgRef.current && mosaicFrame) {
      imgRef.current.src = "data:image/jpeg;base64," + mosaicFrame;
    }
  }, [mosaicFrame]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-white">

      <div className="w-full max-w-4xl text-center mb-4">
        <h1 className="text-2xl font-bold">Live Call</h1>
      </div>

      {/* VIDEO FRAME */}
      <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
        <img ref={imgRef} className="w-[640px] h-[480px] object-cover" />
      </div>

      {/* LEAVE BUTTON */}
      <button
        onClick={onLeave}
        className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-lg"
      >
        Leave Call
      </button>
    </div>
  );
}
