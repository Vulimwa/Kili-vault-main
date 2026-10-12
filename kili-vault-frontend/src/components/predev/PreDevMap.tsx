import { lazy, Suspense, useRef, useState } from 'react';
import {
  MAP_LAYERS,
  SITE_INFRA_LAYER_IDS,
  type SiteInfraLayerId,
} from '@/config/mapLayers';
import { formatRoadProximity, type SiteProximity } from '@/lib/siteProximity';
import { MapSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

const KilimaniMap = lazy(() =>
  import('@/components/map/KilimaniMap').then((module) => ({
    default: module.KilimaniMap,
  })),
);

const PREDEV_MAP_LAYERS = MAP_LAYERS.filter(
  (layer) =>
    SITE_INFRA_LAYER_IDS.includes(layer.id as SiteInfraLayerId) &&
    layer.id !== 'power-lines',
);
const NO_CASES: never[] = [];

interface PreDevMapProps {
  lat: number | null;
  lon: number | null;
  onPinDrop: (lat: number, lon: number) => void;
  showProximity?: boolean;
  className?: string;
}

const DEFAULT_LAYER_VISIBILITY: Record<SiteInfraLayerId, boolean> = {
  buildings: true,
  roads: true,
  'sewer-areas': true,
  // Keep the utility service off the startup path; proximity behavior is
  // preserved for the layers already used by this check.
  'power-lines': false,
  rivers: false,
  'river-buffer': false,
};

export function PreDevMap({
  lat,
  lon,
  onPinDrop,
  showProximity = true,
  className,
}: PreDevMapProps) {
  const [pinPlaced, setPinPlaced] = useState(false);
  const [layerVisibility, setLayerVisibility] =
    useState<Record<string, boolean>>(DEFAULT_LAYER_VISIBILITY);
  const [proximity, setProximity] = useState<SiteProximity | null>(null);
  const onPinDropRef = useRef(onPinDrop);
  onPinDropRef.current = onPinDrop;

  const layerControls = (
    <div className="pointer-events-auto absolute right-3 top-14 z-20 w-60 max-w-[90%] border border-sand bg-[var(--calcite-color-background)] shadow-soft">
      <calcite-block
        heading="Map layers"
        description="Toggle planning context on the map."
        collapsible
      >
        <div className="grid gap-2 px-3 pb-3 pt-2">
          {SITE_INFRA_LAYER_IDS.map((id) => {
            const config = MAP_LAYERS.find((layer) => layer.id === id);
            if (!config) return null;
            return (
              <calcite-label
                key={id}
                layout="inline"
                className="min-w-0 text-xs text-charcoal"
              >
                <calcite-checkbox
                  checked={layerVisibility[id]}
                  oncalciteCheckboxChange={() =>
                    setLayerVisibility((previous) => ({
                      ...previous,
                      [id]: !previous[id],
                    }))
                  }
                />
                <span>{config.title}</span>
              </calcite-label>
            );
          })}
        </div>
      </calcite-block>
    </div>
  );

  return (
    <div
      className={cn(
        'relative min-w-0 overflow-hidden border border-sand bg-[var(--calcite-color-background)]',
        className ?? 'min-h-[280px]',
      )}
    >
      <Suspense
        fallback={
          <div className="absolute inset-0 z-10">
            <MapSkeleton />
          </div>
        }
      >
        <KilimaniMap
          cases={NO_CASES}
          layerVisibility={layerVisibility}
          mapLayers={PREDEV_MAP_LAYERS}
          showCases={false}
          showDetections={false}
          showAttributionFooter
          sitePin={lat != null && lon != null ? { lat, lon } : null}
          showSiteProximity={showProximity}
          sitePinPlaced={pinPlaced}
          onSiteProximityChange={setProximity}
          onMapClick={(nextLat, nextLon) => {
            setPinPlaced(true);
            onPinDropRef.current(nextLat, nextLon);
          }}
          pinOnly
          className="h-full w-full min-h-0 rounded-none border-0"
        />
      </Suspense>

      <div className="pointer-events-none absolute inset-x-3 top-3 z-20">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <calcite-chip icon="map" scale="s" className="pointer-events-auto">
            {lat != null && lon != null
              ? 'Site selected — tap to move pin'
              : 'Tap map to set your plot location'}
          </calcite-chip>
          <calcite-chip scale="s">Top-down map</calcite-chip>
        </div>
      </div>

      <calcite-chip
        scale="s"
        className="pointer-events-none absolute left-3 top-14 z-10 max-w-[90%]"
      >
        {showProximity
          ? 'Dotted rings show 30 m and 50 m proximity guides.'
          : 'Tap the map to place or move the report pin.'}
      </calcite-chip>

      {layerControls}

      {lat != null && lon != null && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 w-64 max-w-[90%]">
          <calcite-notice open kind="info" scale="s">
            <span slot="title">Selected site</span>
            <p className="font-mono text-xs font-medium text-charcoal">
              {lat.toFixed(5)}, {lon.toFixed(5)}
            </p>
            {proximity && (
              <div className="mt-1 text-xs text-charcoal-muted">
                <p>{formatRoadProximity(proximity.roadDistanceM)}</p>
                <p>
                  {proximity.inSeweredArea
                    ? 'Inside sewered area'
                    : 'Outside sewered catchment'}
                </p>
                {proximity.nearPowerLine && (
                  <p className="font-medium text-charcoal">
                    Near 11 kV line — wayleave check
                  </p>
                )}
              </div>
            )}
          </calcite-notice>
        </div>
      )}
    </div>
  );
}
