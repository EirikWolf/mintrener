import React, { useState } from 'react';
import {
  bluetoothHeartRateService,
  HeartRateData,
} from '../../services/bluetoothHeartRateService';
import { Heart, Bluetooth, BluetoothOff, X } from 'lucide-react';

interface HeartRateWidgetProps {
  onHeartRateUpdate?: (bpm: number) => void;
}

export const HeartRateWidget: React.FC<HeartRateWidgetProps> = ({ onHeartRateUpdate }) => {
  const [data, setData] = useState<HeartRateData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSupported = bluetoothHeartRateService.isSupported();

  const handleConnect = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      const ok = await bluetoothHeartRateService.connect(
        (hrData) => {
          setData(hrData);
          setIsConnected(true);
          if (onHeartRateUpdate) {
            onHeartRateUpdate(hrData.heartRate);
          }
        },
        () => {
          setIsConnected(false);
          setData(null);
        }
      );
      if (ok) {
        setIsModalOpen(false);
      } else {
        setErrorMsg('Kunne ikke koble til. Sørg for at pulsbeltet eller klokken sender puls (Broadcast Heart Rate).');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Tilkobling feilet.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    bluetoothHeartRateService.disconnect();
    setIsConnected(false);
    setData(null);
  };

  if (!isSupported) {
    return null; // Skjules i nettlesere uten Web Bluetooth
  }

  return (
    <>
      {/* Liten sanntids-widget */}
      {isConnected && data ? (
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold transition-all animate-in fade-in ${data.zoneColor}`}
        >
          <Heart className="w-3 h-3 text-rose-500 fill-current animate-pulse" />
          <span className="font-mono font-black">{data.heartRate}</span>
          <span className="text-[9px] uppercase font-bold opacity-80">bpm</span>
        </button>
      ) : (
        <button
          onClick={() => setIsModalOpen(true)}
          title="Koble til pulsbelte / Garmin / Amazfit"
          className="p-1.5 rounded-full text-zinc-500 hover:text-rose-400 hover:bg-zinc-800/80 transition-all"
        >
          <Heart className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Modal for tilkobling */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500 fill-current" />
                <h3 className="text-sm font-bold text-white">Pulsmåler & Klokke (BLE)</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-zinc-300">
              <p className="text-[11px] text-zinc-400">
                Koble til standard <strong>Bluetooth Smart (BLE)</strong> pulsbelter eller smartklokker (Garmin, Amazfit/Zepp, Polar, Wahoo).
              </p>

              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-2.5 text-[10px] text-zinc-400 space-y-1">
                <p className="font-bold text-zinc-300">💡 For Garmin / Amazfit:</p>
                <p>• <strong>Garmin:</strong> Innstillinger → Sensorer → Send puls (Broadcast Heart Rate) → Start.</p>
                <p>• <strong>Amazfit:</strong> Profil → Klokke → Del pulsaktivitet (Heart Rate Sharing) → På.</p>
              </div>

              {isConnected && data ? (
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Heart className="w-6 h-6 text-rose-500 fill-current animate-pulse" />
                    <span className="text-3xl font-black text-white font-mono">{data.heartRate}</span>
                    <span className="text-xs font-bold text-zinc-400">BPM</span>
                  </div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-900 border border-zinc-800 text-zinc-200">
                    {data.zoneName}
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="w-full mt-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-rose-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                  >
                    <BluetoothOff className="w-3.5 h-3.5" />
                    Koble fra ({data.deviceName})
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-50 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-600/20"
                >
                  <Bluetooth className="w-4 h-4" />
                  {isConnecting ? 'Søker etter enheter...' : 'Koble til pulssensor'}
                </button>
              )}

              {errorMsg && (
                <div className="p-2 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 text-[10px]">
                  {errorMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
