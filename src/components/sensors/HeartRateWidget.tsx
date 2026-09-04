import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  // Widgeten kan unmountes og remountes midt i en aktiv BLE-tilkobling — siden
  // fokusmodus (Oppgave 8) skjuler hele toppraden under en økt og viser den
  // igjen ved fullført/idle. Selve tilkoblingen (singleton-tjenesten) lever
  // videre uavhengig av React-treet, så vi initialiserer fra tjenestens
  // faktiske tilstand i stedet for å anta «ikke tilkoblet» ved hver remount.
  const [isConnected, setIsConnected] = useState(() => bluetoothHeartRateService.isConnected());
  const [reconnectAttempt, setReconnectAttempt] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSupported = bluetoothHeartRateService.isSupported();

  // Ved remount mens tilkoblingen allerede lever: koble de nye callbackene til
  // tjenesten (uten ny paring), slik at widgeten fortsetter å motta puls-
  // oppdateringer og disconnect-varsler etter at komponenten skiftes ut.
  useEffect(() => {
    if (bluetoothHeartRateService.isConnected()) {
      bluetoothHeartRateService.reattach(
        (hrData) => {
          setData(hrData);
          setIsConnected(true);
          setReconnectAttempt(null);
          if (onHeartRateUpdate) {
            onHeartRateUpdate(hrData.heartRate);
          }
        },
        () => {
          setIsConnected(false);
          setReconnectAttempt(null);
          setData(null);
        },
        (attempt) => {
          setReconnectAttempt(attempt + 1);
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onHeartRateUpdate]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      const ok = await bluetoothHeartRateService.connect(
        (hrData) => {
          setData(hrData);
          setIsConnected(true);
          setReconnectAttempt(null);
          if (onHeartRateUpdate) {
            onHeartRateUpdate(hrData.heartRate);
          }
        },
        () => {
          setIsConnected(false);
          setReconnectAttempt(null);
          setData(null);
        },
        (attempt) => {
          setReconnectAttempt(attempt + 1);
        }
      );
      if (ok) {
        setIsModalOpen(false);
      } else {
        setErrorMsg('Ingen enhet valgt, eller klokken sender ikke puls. Sjekk at «Send puls / Broadcast Heart Rate» er aktivert på klokken.');
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
    return null; // Skjules i nettlesere uten Web Bluetooth (f.eks. iOS Safari)
  }

  const modalContent = isModalOpen ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4 relative z-[101]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-current" />
            <h3 className="text-sm font-bold text-white">Pulsmåler & Klokke (BLE)</h3>
          </div>
          <button
            onClick={() => setIsModalOpen(false)}
            aria-label="Lukk modal"
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info & Instruksjoner */}
        <div className="space-y-3 text-xs text-zinc-300">
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Koble direkte til standard <strong>Bluetooth Smart (BLE)</strong> pulsbelter eller smartklokker (Garmin, Amazfit, Polar, Wahoo).
          </p>

          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-3 text-[11px] text-zinc-400 space-y-2">
            <p className="font-bold text-zinc-200">💡 Slik gjør du klokken synlig:</p>
            <div className="space-y-1.5 text-[10.5px]">
              <p>
                • <strong>Garmin:</strong> Hold inne meny → <em>Sensorer og tilbehør</em> → <em>Pulsmåler</em> → <strong>Send puls (Broadcast HR)</strong> → <em>Start</em>.
              </p>
              <p>
                • <strong>Amazfit:</strong> Åpne Zepp-app → <em>Profil</em> → <em>Klokke</em> → <strong>Del pulsaktivitet (Heart Rate Sharing)</strong> → <em>På</em>.
              </p>
              <p>
                • <strong>Polar / Wahoo pulsbelte:</strong> Ta på beltet med fuktede elektroder.
              </p>
            </div>
          </div>

          {isConnected && data ? (
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2.5 text-center">
              <div className="flex items-center justify-center gap-2">
                <Heart className="w-7 h-7 text-rose-500 fill-current animate-pulse" />
                <span className="text-4xl font-black text-white font-mono">{data.heartRate}</span>
                <span className="text-xs font-bold text-zinc-400">BPM</span>
              </div>
              <div className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-900 border border-zinc-800 text-zinc-200">
                {data.zoneName}
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full mt-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-rose-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <BluetoothOff className="w-4 h-4" />
                Koble fra ({data.deviceName})
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-50 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-600/30"
            >
              <Bluetooth className="w-4 h-4" />
              {isConnecting ? 'Åpner Bluetooth-søker...' : 'Koble til pulssensor'}
            </button>
          )}

          {errorMsg && (
            <div className="p-2.5 bg-rose-950/50 border border-rose-900/60 rounded-xl text-rose-300 text-[11px] leading-relaxed">
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Liten puls-badge eller ikon i topplinjen */}
      {reconnectAttempt !== null ? (
        <button
          onClick={() => setIsModalOpen(true)}
          title={`Gjenoppretter Bluetooth-kontakt (forsøk ${reconnectAttempt}/5)...`}
          aria-label="Gjenoppretter pulsmåler"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/60 bg-amber-950/80 text-amber-300 text-[10px] font-bold transition-all shadow-sm animate-pulse"
        >
          <Bluetooth className="w-3.5 h-3.5 text-amber-400" />
          <span>Søker... ({reconnectAttempt})</span>
        </button>
      ) : isConnected && data ? (
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all shadow-sm ${data.zoneColor}`}
        >
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-current animate-pulse" />
          <span className="font-mono font-black">{data.heartRate}</span>
          <span className="text-[9px] uppercase font-bold opacity-80">bpm</span>
        </button>
      ) : (
        <button
          onClick={() => setIsModalOpen(true)}
          title="Koble til pulsbelte / Garmin / Amazfit"
          aria-label="Åpne pulsmåler"
          className="p-1.5 rounded-full text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-all"
        >
          <Heart className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Modal rendret på document.body via Portal */}
      {typeof document !== 'undefined' && modalContent && createPortal(modalContent, document.body)}
    </>
  );
};
