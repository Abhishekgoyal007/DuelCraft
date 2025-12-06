// src/components/LayeredCharacterPreview.jsx
// Asset positioning configuration - offsetY as percentage of container height
const LAYER_CONFIG = {
  background: { zIndex: 0, anchorY: 0.5, scale: 1.2 },    // Center, full background
  body: { zIndex: 2, anchorY: 0.9, scale: 0.6 },           // Near bottom
  bottoms: { zIndex: 3, anchorY: 0.85, scale: 0.5 },       // Legs area
  shoes: { zIndex: 3, anchorY: 0.95, scale: 0.3 },         // At feet
  tops: { zIndex: 4, anchorY: 0.65, scale: 0.5 },          // Torso
  mouth: { zIndex: 5, anchorY: 0.45, scale: 0.25 },        // Face lower
  eyes: { zIndex: 6, anchorY: 0.4, scale: 0.3 },           // Face upper
  hair: { zIndex: 8, anchorY: 0.3, scale: 0.6 },           // Top of head
  accessory: { zIndex: 9, anchorY: 0.35, scale: 0.4 },     // Head accessories
  effect: { zIndex: 10, anchorY: 0.5, scale: 0.8 }         // Around character
};

const LAYER_ORDER = ['background', 'body', 'bottoms', 'shoes', 'tops', 'mouth', 'eyes', 'hair', 'accessory', 'effect'];

export default function LayeredCharacterPreview({ equipped, getAssetById }) {

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden" 
         style={{ 
           background: 'linear-gradient(180deg, #87CEEB 0%, #E0F6FF 60%, #90EE90 60%, #228B22 100%)',
         }}>
      {/* Render layers in correct order with positioning */}
      {LAYER_ORDER.map((category) => {
        if (!equipped[category]) return null;
        
        const asset = getAssetById(equipped[category]);
        if (!asset?.url) return null;

        const config = LAYER_CONFIG[category] || { zIndex: 5, anchorY: 0.5, scale: 0.5 };
        
        return (
          <img
            key={category}
            src={asset.url}
            alt={asset.name}
            className="absolute"
            style={{ 
              imageRendering: 'pixelated',
              zIndex: config.zIndex,
              top: `${config.anchorY * 100}%`,
              left: '50%',
              transform: `translate(-50%, -50%) scale(${config.scale})`,
              maxWidth: '150%',
              height: 'auto'
            }}
          />
        );
      })}
    </div>
  );
}
