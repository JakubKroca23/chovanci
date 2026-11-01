"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

type Props = {
  code: string;
  /** Absolute join URL shown in QR / copy. */
  joinUrl: string;
};

export function JoinInvite({ code, joinUrl }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(joinUrl, {
      width: 280,
      margin: 1,
      color: { dark: "#1a1410", light: "#fff8f0" },
    })
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => {
        if (alive) setQr(null);
      });
    return () => {
      alive = false;
    };
  }, [joinUrl]);

  const shortHint = useMemo(
    () => `Připoj se na chovanec.propoj.app · kód ${code}`,
    [code],
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setNote("Odkaz zkopírován.");
    } catch {
      setNote("Kopírování selhalo — zkopíruj odkaz ručně.");
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setNote("Kód zkopírován.");
    } catch {
      setNote("Kopírování kódu selhalo.");
    }
  }

  return (
    <div className="join-invite">
      <p className="join-invite__hint">{shortHint}</p>
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="join-invite__qr" src={qr} alt={`QR kód místnosti ${code}`} />
      ) : (
        <p className="join-invite__waiting">Generuji QR…</p>
      )}
      <div className="join-invite__actions">
        <button type="button" className="multi__btn multi__btn--secondary" onClick={copyLink}>
          Kopírovat odkaz
        </button>
        <button type="button" className="multi__btn multi__btn--secondary" onClick={copyCode}>
          Kopírovat kód
        </button>
      </div>
      {note && <p className="join-invite__note">{note}</p>}
    </div>
  );
}
