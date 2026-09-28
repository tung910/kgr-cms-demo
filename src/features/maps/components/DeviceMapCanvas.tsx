import type { MapMarker } from '../mocks/mapMockData';

const statusColors: Record<MapMarker['status'], string> = {
  online: '#1F8A3B',
  offline: '#9A9B9D',
  alert: '#D9131F',
};

export interface DeviceMapCanvasProps {
  markers: MapMarker[];
  selectedMarkerId: string | null;
  onSelectMarker: (id: string) => void;
}

export function DeviceMapCanvas({
  markers,
  selectedMarkerId,
  onSelectMarker,
}: DeviceMapCanvasProps) {
  return (
    <div className="relative h-80 w-full overflow-hidden rounded-lg border border-[#E7E8E9] bg-[#F3F4F4] sm:h-96">
      {markers.map((marker) => {
        const isSelected = marker.id === selectedMarkerId;
        return (
          <button
            key={marker.id}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${marker.id} - ${marker.region}`}
            title={marker.id}
            className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-transform"
            style={{
              left: marker.x + '%',
              top: marker.y + '%',
              backgroundColor: statusColors[marker.status],
              borderColor: isSelected ? '#0F62FE' : '#FFFFFF',
              transform: isSelected
                ? 'translate(-50%, -50%) scale(1.4)'
                : 'translate(-50%, -50%)',
            }}
            onClick={() => onSelectMarker(marker.id)}
          />
        );
      })}
    </div>
  );
}
