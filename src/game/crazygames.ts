import { soundFx } from './audio';

interface CrazyAdCallbacks {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: unknown) => void;
}

interface CrazyGamesSDKv3 {
  init: () => Promise<void>;
  environment?: string;
  game?: {
    gameplayStart: () => void;
    gameplayStop: () => void;
    happytime: () => void;
  };
  ad?: {
    requestAd: (type: 'midgame' | 'rewarded', callbacks: CrazyAdCallbacks) => void;
  };
}

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: CrazyGamesSDKv3;
    };
  }
}

class CrazyGamesBridge {
  private initialized = false;
  private isLiveSdk = false;

  public async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const sdk = window.CrazyGames?.SDK;
      if (sdk && typeof sdk.init === 'function') {
        await sdk.init();
        this.isLiveSdk = true;
      }
    } catch {
      this.isLiveSdk = false;
    }
  }

  public isRunningOnCrazyGames(): boolean {
    return this.isLiveSdk;
  }

  public gameplayStart() {
    try {
      window.CrazyGames?.SDK?.game?.gameplayStart();
    } catch {
      // ignore outside portal
    }
  }

  public gameplayStop() {
    try {
      window.CrazyGames?.SDK?.game?.gameplayStop();
    } catch {
      // ignore outside portal
    }
  }

  public happytime() {
    try {
      window.CrazyGames?.SDK?.game?.happytime();
    } catch {
      // ignore outside portal
    }
  }

  public requestRewardedAd(onReward: () => void, onError?: (reason: string) => void) {
    const sdk = window.CrazyGames?.SDK;
    if (this.isLiveSdk && sdk?.ad?.requestAd) {
      const wasMuted = soundFx.isMuted();
      try {
        sdk.ad.requestAd('rewarded', {
          adStarted: () => {
            soundFx.setMuted(true);
            this.gameplayStop();
          },
          adFinished: () => {
            soundFx.setMuted(wasMuted);
            this.gameplayStart();
            onReward();
          },
          adError: () => {
            soundFx.setMuted(wasMuted);
            this.gameplayStart();
            onError?.('Ad unavailable right now. Try again shortly.');
          },
        });
        return;
      } catch {
        soundFx.setMuted(wasMuted);
      }
    }

    // Local / standalone QA fallback: grant reward directly after brief simulated sponsor beat
    onReward();
  }

  public requestMidgameAd(onDone?: () => void) {
    const sdk = window.CrazyGames?.SDK;
    if (this.isLiveSdk && sdk?.ad?.requestAd) {
      const wasMuted = soundFx.isMuted();
      try {
        sdk.ad.requestAd('midgame', {
          adStarted: () => {
            soundFx.setMuted(true);
            this.gameplayStop();
          },
          adFinished: () => {
            soundFx.setMuted(wasMuted);
            this.gameplayStart();
            onDone?.();
          },
          adError: () => {
            soundFx.setMuted(wasMuted);
            this.gameplayStart();
            onDone?.();
          },
        });
        return;
      } catch {
        soundFx.setMuted(wasMuted);
      }
    }
    onDone?.();
  }
}

export const crazyGames = new CrazyGamesBridge();
