import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, 
  Maximize, Minimize, Mic, Download, Layers,
  ChevronRight, ArrowRight, ShieldCheck, Ship, Anchor,
  Video, Printer, Check, Sparkles, TrendingUp, BarChart3, Sliders, Cpu,
  Award, Compass, Activity, Brain, UserCheck, Terminal, AlertTriangle,
  Calendar, Zap, Waves, HelpCircle, Tv, Monitor
} from 'lucide-react';
import { KEYNOTE_BEATS, KeynoteBeat, TOTAL_KEYNOTE_SECONDS } from '../data/presentationSlides';
import { FULL_TIME_SERIES, BaselineModelChoice, GROUP_INFO, VALIDATION_METRICS } from '../data/forecastingData';
import { ambientDrone } from '../utils/ambientAudio';
import { ExportPresentationModal } from './ExportPresentationModal';
import { 
  exportPrintableDeck, 
  downloadOfficialPPTX, 
  downloadOfficialVideoMP4, 
  formatTime 
} from '../utils/exportPresentation';
import { generateNativePPTX } from '../utils/pptxExport';
import { PixelShipVisual } from './PixelShipVisual';

// Authoritative Image Assets for Group 7 Keynote - 3D Character Mascots & Maritime Port Scenery
const MASCOT_BLUE = '/src/assets/images/mascot_blue_analyst_1791196865420.jpg';
const MASCOT_ORANGE = '/src/assets/images/mascot_orange_planner_1791196885029.jpg';
const MASCOT_GREEN = '/src/assets/images/mascot_green_validator_1791196903349.jpg';

const ESTABLISHING_SHOT_IMG = '/src/assets/images/cargo_ship_breakwater_1791024998811.jpg';
const PORT_TERMINAL_IMG = '/src/assets/images/pola_container_terminal_1791024986178.jpg';
const CONTAINER_YARD_IMG = '/src/assets/images/container_yard_twilight_1791025012665.jpg';
const OPERATIONS_COMMAND_IMG = '/src/assets/images/operations_analytics_command_1790930073715.jpg';
const PORT_PLANNER_IMG = '/src/assets/images/port_control_planner_1791028044582.jpg';

interface VideoPresentationPlayerProps {
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  selectedBaseline?: BaselineModelChoice;
  onSelectBaseline?: (b: BaselineModelChoice) => void;
  onOpen3DStudio?: () => void;
}

export const VideoPresentationPlayer: React.FC<VideoPresentationPlayerProps> = ({
  isPlaying,
  setIsPlaying,
  onOpen3DStudio
}) => {
  const [currentBeatIndex, setCurrentBeatIndex] = useState<number>(0);
  const [beatElapsedSeconds, setBeatElapsedSeconds] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showPresenterHUD, setShowPresenterHUD] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isGeneratingPPTX, setIsGeneratingPPTX] = useState<boolean>(false);
  const [mouseActive, setMouseActive] = useState<boolean>(true);
  const [videoNotification, setVideoNotification] = useState<string | null>(null);
  const [beat1SelectedComponent, setBeat1SelectedComponent] = useState<'all' | 'trend' | 'seasonality' | 'cyclicality' | 'randomness' | null>(null);

  // TV / Big Screen presentation mode (Auto-detect wide display / TV resolution or user toggle)
  const [isTVMode, setIsTVMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1500 || window.innerHeight >= 900;
    }
    return false;
  });

  // Mobile phone screen detection for adaptive layouts
  const [isPhoneScreen, setIsPhoneScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 640;
      setIsPhoneScreen(isMobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Touch swipe support for mobile phone setup
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mouseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentBeat: KeynoteBeat = KEYNOTE_BEATS[currentBeatIndex] || KEYNOTE_BEATS[0];

  // Cumulative elapsed seconds across all beats
  const totalElapsedSeconds = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < currentBeatIndex; i++) {
      sum += KEYNOTE_BEATS[i].durationSeconds;
    }
    return sum + beatElapsedSeconds;
  }, [currentBeatIndex, beatElapsedSeconds]);

  // Master Playback Timer (Tick every 100ms) - Pure ticker
  useEffect(() => {
    if (!isPlaying) {
      ambientDrone.stop();
      return;
    }

    if (!isMuted) {
      ambientDrone.play();
    }

    const interval = setInterval(() => {
      setBeatElapsedSeconds((prev) => prev + 0.1);
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [isPlaying, isMuted]);

  // Clean Beat Progression and Completion Effect (runs during commit phase, not during render)
  useEffect(() => {
    if (!isPlaying) return;

    const duration = currentBeat.durationSeconds;
    if (beatElapsedSeconds >= duration) {
      if (currentBeatIndex < KEYNOTE_BEATS.length - 1) {
        setCurrentBeatIndex((idx) => idx + 1);
        setBeatElapsedSeconds(0);
      } else {
        setIsPlaying(false);
        ambientDrone.stop();
        setBeatElapsedSeconds(duration);
      }
    }
  }, [beatElapsedSeconds, currentBeat.durationSeconds, currentBeatIndex, isPlaying, setIsPlaying]);

  // Ensure ambient audio stops if unmounted
  useEffect(() => {
    return () => {
      ambientDrone.stop();
    };
  }, []);

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (isPlaying) ambientDrone.play();
    } else {
      setIsMuted(true);
      ambientDrone.stop();
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
        if (window.innerWidth >= 1300 || window.innerHeight >= 800) {
          setIsTVMode(true);
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fallback for browsers or devices without standard fullscreen API
      setIsFullscreen((prev) => !prev);
    }
  };

  const toggleTVMode = () => {
    setIsTVMode((prev) => {
      const next = !prev;
      setVideoNotification(next ? '📺 TV Mode: Large Stage & Enhanced Visibility' : 'Standard Display Mode');
      setTimeout(() => setVideoNotification(null), 2500);
      return next;
    });
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Jump to specific beat
  const skipToBeat = (index: number) => {
    setCurrentBeatIndex(index);
    setBeatElapsedSeconds(0);
  };

  // Keyboard Shortcuts (Space, Arrows, F, T, C, P, V, S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipToBeat(Math.min(KEYNOTE_BEATS.length - 1, currentBeatIndex + 1));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipToBeat(Math.max(0, currentBeatIndex - 1));
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        toggleTVMode();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setShowPresenterHUD((prev) => !prev);
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleDownloadPPTX();
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        handleDownloadVideoMP4();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleExportSlides();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentBeatIndex, setIsPlaying]);

  // Mouse activity timer for autohiding transport
  const handleMouseMove = () => {
    setMouseActive(true);
    if (mouseTimerRef.current) clearTimeout(mouseTimerRef.current);
    mouseTimerRef.current = setTimeout(() => {
      if (isPlaying) setMouseActive(false);
    }, 2800);
  };

  // Touch swipe support for mobile phone setup
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    setMouseActive(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartXRef.current;
    const diffY = e.changedTouches[0].clientY - touchStartYRef.current;
    
    // Horizontal swipe threshold: 45px
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 45) {
      if (diffX < 0) {
        // Swiped left -> next beat
        skipToBeat(Math.min(KEYNOTE_BEATS.length - 1, currentBeatIndex + 1));
      } else {
        // Swiped right -> prev beat
        skipToBeat(Math.max(0, currentBeatIndex - 1));
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Export Handlers
  const handleDownloadPPTX = async () => {
    setIsGeneratingPPTX(true);
    setVideoNotification("Generating official PowerPoint Presentation (.pptx)...");
    try {
      await generateNativePPTX();
      setVideoNotification("PowerPoint Deck downloaded successfully!");
    } catch {
      downloadOfficialPPTX();
      setVideoNotification("Direct PPTX downloaded successfully!");
    } finally {
      setIsGeneratingPPTX(false);
      setTimeout(() => setVideoNotification(null), 4000);
    }
  };

  const handleDownloadVideoMP4 = () => {
    downloadOfficialVideoMP4();
    setVideoNotification("Downloading official 1080p Keynote Video (MP4)...");
    setTimeout(() => setVideoNotification(null), 4000);
  };

  const handleExportSlides = () => {
    exportPrintableDeck();
  };

  // SVG Chart Geometry Constants
  const svgWidth = 1000;
  const svgHeight = 440;
  const padLeft = 85;
  const padRight = 65;
  const padTop = 50;
  const padBottom = 55;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;
  const minVal = 200000;
  const maxVal = 480000;

  const getX = (period: number) => padLeft + ((period - 1) / 35) * plotW;
  const getY = (val: number) => padTop + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;

  const actualPoints = useMemo(() => {
    return FULL_TIME_SERIES.map((row) => ({
      period: row.period,
      x: getX(row.period),
      y: getY(row.actual),
      val: row.actual,
      month: row.monthName
    }));
  }, []);

  const actualPathString = useMemo(() => {
    return actualPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
  }, [actualPoints]);

  const smaPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    const p1 = FULL_TIME_SERIES[0];
    const p2 = FULL_TIME_SERIES[1];
    const p3 = FULL_TIME_SERIES[2];
    pts.push({ x: getX(1), y: getY(p1.actual) });
    pts.push({ x: getX(2), y: getY((p1.actual + p2.actual) / 2) });
    pts.push({ x: getX(3), y: getY((p1.actual + p2.actual + p3.actual) / 3) });
    FULL_TIME_SERIES.filter((r) => r.period >= 4 && r.sma3 !== undefined).forEach((r) => {
      pts.push({ x: getX(r.period), y: getY(r.sma3!) });
    });
    return pts;
  }, []);

  const wmaPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    const p1 = FULL_TIME_SERIES[0];
    const p2 = FULL_TIME_SERIES[1];
    const p3 = FULL_TIME_SERIES[2];
    pts.push({ x: getX(1), y: getY(p1.actual) });
    pts.push({ x: getX(2), y: getY(0.6 * p2.actual + 0.4 * p1.actual) });
    pts.push({ x: getX(3), y: getY(0.5 * p3.actual + 0.3 * p2.actual + 0.2 * p1.actual) });
    FULL_TIME_SERIES.filter((r) => r.period >= 4 && r.wma3 !== undefined).forEach((r) => {
      pts.push({ x: getX(r.period), y: getY(r.wma3!) });
    });
    return pts;
  }, []);

  const es05Points = useMemo(() => {
    const pts = [{ x: getX(1), y: getY(FULL_TIME_SERIES[0].actual) }];
    FULL_TIME_SERIES.filter((r) => r.es05 !== undefined).forEach((r) => {
      pts.push({ x: getX(r.period), y: getY(r.es05!) });
    });
    return pts;
  }, []);

  const es02Points = useMemo(() => {
    const pts = [{ x: getX(1), y: getY(FULL_TIME_SERIES[0].actual) }];
    FULL_TIME_SERIES.filter((r) => r.es02 !== undefined).forEach((r) => {
      pts.push({ x: getX(r.period), y: getY(r.es02!) });
    });
    return pts;
  }, []);

  const es08Points = useMemo(() => {
    const pts = [{ x: getX(1), y: getY(FULL_TIME_SERIES[0].actual) }];
    FULL_TIME_SERIES.filter((r) => r.es08 !== undefined).forEach((r) => {
      pts.push({ x: getX(r.period), y: getY(r.es08!) });
    });
    return pts;
  }, []);

  const trendPoints = useMemo(() => {
    return [
      { x: getX(1), y: getY(FULL_TIME_SERIES[0].trend || 409404) },
      { x: getX(36), y: getY(FULL_TIME_SERIES[35].trend || 331833) }
    ];
  }, []);

  const slrPoints = useMemo(() => {
    return FULL_TIME_SERIES.map((r) => ({
      period: r.period,
      x: getX(r.period),
      y: getY(r.trend || 409404)
    }));
  }, []);

  // Development Stage Horizon (Periods 1 to 30 · Jan 2022 – Jun 2024 · Validation Sealed)
  const getDevX = (period: number) => padLeft + ((period - 1) / 29) * plotW;

  const devActualPoints = useMemo(() => {
    return FULL_TIME_SERIES.filter((r) => r.period <= 30).map((row) => ({
      period: row.period,
      x: getDevX(row.period),
      y: getY(row.actual),
      val: row.actual,
      month: row.monthName
    }));
  }, []);

  const devActualPath = useMemo(() => {
    return devActualPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
  }, [devActualPoints]);

  const devSmaPoints = useMemo(() => {
    return FULL_TIME_SERIES
      .filter((r) => r.period <= 30 && r.period >= 4 && r.sma3 !== undefined)
      .map((r) => ({ x: getDevX(r.period), y: getY(r.sma3!) }));
  }, []);

  const devWmaPoints = useMemo(() => {
    return FULL_TIME_SERIES
      .filter((r) => r.period <= 30 && r.period >= 4 && r.wma3 !== undefined)
      .map((r) => ({ x: getDevX(r.period), y: getY(r.wma3!) }));
  }, []);

  const devEs05Points = useMemo(() => {
    const pts = [{ x: getDevX(1), y: getY(FULL_TIME_SERIES[0].actual) }];
    FULL_TIME_SERIES.filter((r) => r.period <= 30 && r.period >= 2 && r.es05 !== undefined).forEach((r) => {
      pts.push({ x: getDevX(r.period), y: getY(r.es05!) });
    });
    return pts;
  }, []);

  const devEs02Points = useMemo(() => {
    const pts = [{ x: getDevX(1), y: getY(FULL_TIME_SERIES[0].actual) }];
    FULL_TIME_SERIES.filter((r) => r.period <= 30 && r.period >= 2 && r.es02 !== undefined).forEach((r) => {
      pts.push({ x: getDevX(r.period), y: getY(r.es02!) });
    });
    return pts;
  }, []);

  const devEs08Points = useMemo(() => {
    const pts = [{ x: getDevX(1), y: getY(FULL_TIME_SERIES[0].actual) }];
    FULL_TIME_SERIES.filter((r) => r.period <= 30 && r.period >= 2 && r.es08 !== undefined).forEach((r) => {
      pts.push({ x: getDevX(r.period), y: getY(r.es08!) });
    });
    return pts;
  }, []);

  const devSlrPoints = useMemo(() => {
    return FULL_TIME_SERIES.filter((r) => r.period <= 30).map((r) => ({
      period: r.period,
      x: getDevX(r.period),
      y: getY(r.trend || 409404)
    }));
  }, []);

  // Development Timeline Ticks (Periods 1-30 · Jan 2022 to Jun 2024 · Validation Sealed)
  const devTicks = useMemo(() => [
    { period: 1, label: 'Jan 22' },
    { period: 7, label: 'Jul 22' },
    { period: 13, label: 'Jan 23' },
    { period: 19, label: 'Jul 23' },
    { period: 25, label: 'Jan 24' },
    { period: 30, label: 'Jun 24' }
  ], []);

  // Beat 2 Choreography (0:41s - 1:25s · 44s total):
  // Phase 1: 4 conventional models in one frame (2x2 grid) (0 - 22s)
  // Phase 2: Overlapped view of 4 conventional models in one frame (22 - 44s)
  // Presenter can toggle between 'grid' and 'overlap' at any time.
  const [choreographyTime, setChoreographyTime] = useState(0);
  const [manualSolo, setManualSolo] = useState<'grid' | 'overlap' | null>(null);

  useEffect(() => {
    let animFrame: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      if (!isPlaying || currentBeatIndex !== 2) {
        setChoreographyTime((prev) => (prev + dt / 1000) % 44);
      }
      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, currentBeatIndex]);

  // Current effective time in Beat 2 (0 to 44s)
  const effectiveBeat2Time =
    isPlaying && currentBeatIndex === 2
      ? beatElapsedSeconds
      : choreographyTime;

  const tBeat2 = effectiveBeat2Time;

  // Helper for smooth cubic ease-in-out run from 0 to 1
  const calcDrawProg = (startTime: number, duration: number, cur: number) => {
    if (cur < startTime) return 0;
    if (cur >= startTime + duration) return 1;
    const ratio = (cur - startTime) / duration;
    return ratio < 0.5 ? 4 * ratio * ratio * ratio : 1 - Math.pow(-2 * ratio + 2, 3) / 2;
  };

  // Beat 2 repeating draw cycle: loops continuously every 6.0 seconds across 30 periods!
  const beat2LoopDuration = 6.0;
  const beat2CycleTime = isPlaying && currentBeatIndex === 2
    ? (beatElapsedSeconds % beat2LoopDuration)
    : (choreographyTime % beat2LoopDuration);
  const gridProgress = Math.min(1.0, Math.max(0.04, beat2CycleTime < 4.8 ? (beat2CycleTime / 4.4) : 1.0));

  // Auto active mode: 'grid' (0-22s) -> 'overlap' (22-44s)
  const autoActiveView = tBeat2 >= 22 ? 'overlap' : 'grid';
  const activeConventionalView = manualSolo !== null ? manualSolo : autoActiveView;
  const activeSoloModel = activeConventionalView === 'overlap' ? 'overlap' : null;

  const soloSmaProg = gridProgress;
  const soloWmaProg = gridProgress;
  const soloEtsProg = gridProgress;
  const soloSlrProg = gridProgress;
  const overlapProg = gridProgress;

  const getPointAtProgress = (pts: { x: number; y: number }[], p: number) => {
    if (!pts || pts.length === 0) return { x: 0, y: 0 };
    if (p <= 0) return pts[0];
    if (p >= 1) return pts[pts.length - 1];
    const total = pts.length - 1;
    const rawIdx = p * total;
    const idx = Math.min(total - 1, Math.floor(rawIdx));
    const f = rawIdx - idx;
    const nextIdx = Math.min(total, idx + 1);
    return {
      x: pts[idx].x + f * (pts[nextIdx].x - pts[idx].x),
      y: pts[idx].y + f * (pts[nextIdx].y - pts[idx].y)
    };
  };

  // Heads for 2x2 grid (Periods 1-30)
  const gridHeadSma = useMemo(() => getPointAtProgress(devSmaPoints, gridProgress), [devSmaPoints, gridProgress]);
  const gridHeadWma = useMemo(() => getPointAtProgress(devWmaPoints, gridProgress), [devWmaPoints, gridProgress]);
  const gridHeadEts05 = useMemo(() => getPointAtProgress(devEs05Points, gridProgress), [devEs05Points, gridProgress]);
  const gridHeadSlr = useMemo(() => getPointAtProgress(devSlrPoints, gridProgress), [devSlrPoints, gridProgress]);

  // Heads for steady center-stage solo (Periods 1-30)
  const soloHeadSma = useMemo(() => getPointAtProgress(devSmaPoints, soloSmaProg), [devSmaPoints, soloSmaProg]);
  const soloHeadWma = useMemo(() => getPointAtProgress(devWmaPoints, soloWmaProg), [devWmaPoints, soloWmaProg]);
  const soloHeadEts02 = useMemo(() => getPointAtProgress(devEs02Points, soloEtsProg), [devEs02Points, soloEtsProg]);
  const soloHeadEts05 = useMemo(() => getPointAtProgress(devEs05Points, soloEtsProg), [devEs05Points, soloEtsProg]);
  const soloHeadEts08 = useMemo(() => getPointAtProgress(devEs08Points, soloEtsProg), [devEs08Points, soloEtsProg]);
  const soloHeadSlr = useMemo(() => getPointAtProgress(devSlrPoints, soloSlrProg), [devSlrPoints, soloSlrProg]);

  // Heads for Overlap all models view (Periods 1-30)
  const overlapHeadSma = useMemo(() => getPointAtProgress(devSmaPoints, overlapProg), [devSmaPoints, overlapProg]);
  const overlapHeadWma = useMemo(() => getPointAtProgress(devWmaPoints, overlapProg), [devWmaPoints, overlapProg]);
  const overlapHeadEts02 = useMemo(() => getPointAtProgress(devEs02Points, overlapProg), [devEs02Points, overlapProg]);
  const overlapHeadEts05 = useMemo(() => getPointAtProgress(devEs05Points, overlapProg), [devEs05Points, overlapProg]);
  const overlapHeadEts08 = useMemo(() => getPointAtProgress(devEs08Points, overlapProg), [devEs08Points, overlapProg]);
  const overlapHeadSlr = useMemo(() => getPointAtProgress(devSlrPoints, overlapProg), [devSlrPoints, overlapProg]);

  // Validation models (Periods 31-36 from PDF Table 5.4)
  const valArimaPoints = useMemo(() => {
    const arimaVals = [395788, 435086, 449029, 454461, 442723, 427066];
    return arimaVals.map((v, i) => ({ x: getX(31 + i), y: getY(v) }));
  }, []);

  const valLrPoints = useMemo(() => {
    const lrVals = [380816, 404950, 416225, 420463, 414842, 405430];
    return lrVals.map((v, i) => ({ x: getX(31 + i), y: getY(v) }));
  }, []);

  const valRfPoints = useMemo(() => {
    const rfVals = [365739, 401997, 412902, 433329, 438313, 420364];
    return rfVals.map((v, i) => ({ x: getX(31 + i), y: getY(v) }));
  }, []);

  const toPath = (pts: { x: number; y: number }[]) => {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  };

  // Accurate Validation Holdout Data from Matplotlib Graph & Google Colab Output (IMG_0379)
  const mlHoldoutData = useMemo(() => [
    { period: 31, date: '2024-07', month: '2024-07', actual: 437961.00, arima: 395788, lr: 380816, rf: 365739 },
    { period: 32, date: '2024-08', month: '2024-08', actual: 449897.75, arima: 435086, lr: 404950, rf: 401997 },
    { period: 33, date: '2024-09', month: '2024-09', actual: 454819.50, arima: 449029, lr: 416225, rf: 412902 },
    { period: 34, date: '2024-10', month: '2024-10', actual: 441773.25, arima: 454461, lr: 420463, rf: 433329 },
    { period: 35, date: '2024-11', month: '2024-11', actual: 425911.50, arima: 442723, lr: 414842, rf: 438313 },
    { period: 36, date: '2024-12', month: '2024-12', actual: 460304.25, arima: 427066, lr: 405430, rf: 420364 }
  ], []);

  // Movement dynamic sequence code requested for visualization rhythm
  const movementPulseArray = useMemo(() => [4, 6, 5.5, 9, 8, 13, 12.5, 19, 24, 23, 33, 48], []);

  const holdoutSvgW = 1000;
  const holdoutSvgH = 440;
  const holdoutPadL = 70;
  const holdoutPadR = 70;
  const holdoutPadT = 40;
  const holdoutPadB = 60;
  const holdoutPlotW = holdoutSvgW - holdoutPadL - holdoutPadR;
  const holdoutPlotH = holdoutSvgH - holdoutPadT - holdoutPadB;
  const holdoutMinY = 350000;
  const holdoutMaxY = 475000;

  const getHoldoutX = (idx: number) => holdoutPadL + (idx / 5) * holdoutPlotW;
  const getHoldoutY = (val: number) => holdoutPadT + holdoutPlotH - ((val - holdoutMinY) / (holdoutMaxY - holdoutMinY)) * holdoutPlotH;

  const holdoutActualPoints = useMemo(() => mlHoldoutData.map((d, i) => ({ x: getHoldoutX(i), y: getHoldoutY(d.actual), val: d.actual, month: d.month })), [mlHoldoutData]);
  const holdoutArimaPoints  = useMemo(() => mlHoldoutData.map((d, i) => ({ x: getHoldoutX(i), y: getHoldoutY(d.arima), val: d.arima, month: d.month })), [mlHoldoutData]);
  const holdoutLrPoints     = useMemo(() => mlHoldoutData.map((d, i) => ({ x: getHoldoutX(i), y: getHoldoutY(d.lr), val: d.lr, month: d.month })), [mlHoldoutData]);
  const holdoutRfPoints     = useMemo(() => mlHoldoutData.map((d, i) => ({ x: getHoldoutX(i), y: getHoldoutY(d.rf), val: d.rf, month: d.month })), [mlHoldoutData]);

  const holdoutActualPath = useMemo(() => holdoutActualPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '), [holdoutActualPoints]);
  const holdoutArimaPath  = useMemo(() => holdoutArimaPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '), [holdoutArimaPoints]);
  const holdoutLrPath     = useMemo(() => holdoutLrPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '), [holdoutLrPoints]);
  const holdoutRfPath     = useMemo(() => holdoutRfPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '), [holdoutRfPoints]);

  // Beat 4 (41s Total):
  // 1. ARIMA first (0s - 10s)
  // 2. Lagged Linear second (10s - 20s)
  // 3. Random Forest third (20s - 30s)
  // 4. All four overlapped / merged into one (30s - 41s)
  const [manualStatFilter, setManualStatFilter] = useState<'all' | 'arima' | 'rf' | 'lr' | null>(null);

  const autoStatFilter: 'all' | 'arima' | 'rf' | 'lr' = useMemo(() => {
    if (beatElapsedSeconds < 10) return 'arima';
    if (beatElapsedSeconds < 20) return 'lr';
    if (beatElapsedSeconds < 30) return 'rf';
    return 'all';
  }, [beatElapsedSeconds]);

  const statModelFilter = manualStatFilter !== null ? manualStatFilter : autoStatFilter;

  const statVsMlProg = useMemo(() => {
    if (currentBeatIndex === 4) {
      if (manualStatFilter !== null) return 1;
      const stageElapsed = beatElapsedSeconds < 10 ? beatElapsedSeconds :
                           beatElapsedSeconds < 20 ? (beatElapsedSeconds - 10) :
                           beatElapsedSeconds < 30 ? (beatElapsedSeconds - 20) :
                           (beatElapsedSeconds - 30);
      return Math.min(1.0, Math.max(0.05, stageElapsed < 6.2 ? (stageElapsed / 5.5) : 1.0));
    }
    return 1;
  }, [currentBeatIndex, beatElapsedSeconds, manualStatFilter]);

  // Moving glowing beacon heads for holdout curves
  const statHeadActual = useMemo(() => getPointAtProgress(holdoutActualPoints, statVsMlProg), [holdoutActualPoints, statVsMlProg]);
  const statHeadArima  = useMemo(() => getPointAtProgress(holdoutArimaPoints, statVsMlProg), [holdoutArimaPoints, statVsMlProg]);
  const statHeadLr     = useMemo(() => getPointAtProgress(holdoutLrPoints, statVsMlProg), [holdoutLrPoints, statVsMlProg]);
  const statHeadRf     = useMemo(() => getPointAtProgress(holdoutRfPoints, statVsMlProg), [holdoutRfPoints, statVsMlProg]);

  // Beat 4 Choreography (Challenger models: ARIMA, Lagged LR, Random Forest · 32s Total)
  const effectiveBeat4Time = isPlaying && currentBeatIndex === 4
    ? beatElapsedSeconds % 32
    : choreographyTime;

  const tBeat4 = effectiveBeat4Time;

  // Phase 0: All 3 run together (0.4s - 4.8s)
  const mlGridProgress = tBeat4 < 5.5 ? calcDrawProg(0.4, 4.4, tBeat4) : 1;

  // Active solo center-stage model (auto or manual click)
  // ARIMA: 5.8s - 12.8s | Lagged LR: 12.8s - 19.8s | Random Forest: 19.8s - 27.0s
  // Immediately at 27.0s, cuts directly to "WHICH ONE WINS?" without returning to all 3 grids.
  const autoMlActiveModel: 'arima' | 'lr' | 'rf' | null =
    tBeat4 >= 5.8 && tBeat4 < 12.8
      ? 'arima'
      : tBeat4 >= 12.8 && tBeat4 < 19.8
      ? 'lr'
      : tBeat4 >= 19.8 && tBeat4 < 27.0
      ? 'rf'
      : null;

  const [manualMlSolo, setManualMlSolo] = useState<'arima' | 'lr' | 'rf' | null>(null);
  const activeMlSoloModel = manualMlSolo !== null ? manualMlSolo : autoMlActiveModel;

  const soloArimaProg = manualMlSolo === 'arima' ? 1 : calcDrawProg(6.3, 3.6, tBeat4);
  const soloLrProg = manualMlSolo === 'lr' ? 1 : calcDrawProg(13.3, 3.6, tBeat4);
  const soloRfProg = manualMlSolo === 'rf' ? 1 : calcDrawProg(20.3, 3.6, tBeat4);

  // Heads for 3-card grid
  const gridHeadArima = useMemo(() => getPointAtProgress(holdoutArimaPoints, mlGridProgress), [holdoutArimaPoints, mlGridProgress]);
  const gridHeadLr = useMemo(() => getPointAtProgress(holdoutLrPoints, mlGridProgress), [holdoutLrPoints, mlGridProgress]);
  const gridHeadRf = useMemo(() => getPointAtProgress(holdoutRfPoints, mlGridProgress), [holdoutRfPoints, mlGridProgress]);

  // Heads for steady center-stage solo
  const soloHeadArima = useMemo(() => getPointAtProgress(holdoutArimaPoints, soloArimaProg), [holdoutArimaPoints, soloArimaProg]);
  const soloHeadLr = useMemo(() => getPointAtProgress(holdoutLrPoints, soloLrProg), [holdoutLrPoints, soloLrProg]);
  const soloHeadRf = useMemo(() => getPointAtProgress(holdoutRfPoints, soloRfProg), [holdoutRfPoints, soloRfProg]);

  // Active decomposition component in Beat 1 (either manually chosen or auto-sequenced)
  const activeBeat1Component = useMemo(() => {
    if (beat1SelectedComponent) return beat1SelectedComponent;
    if (currentBeatIndex !== 1) return 'all';
    if (beatElapsedSeconds < 14) return 'all';
    if (beatElapsedSeconds < 18) return 'trend';
    if (beatElapsedSeconds < 22) return 'seasonality';
    if (beatElapsedSeconds < 26) return 'cyclicality';
    if (beatElapsedSeconds < 34) return 'randomness';
    return 'all';
  }, [beat1SelectedComponent, currentBeatIndex, beatElapsedSeconds]);

  // Macroeconomic cycle points (3-year wave: 2022 high -> 2023 destocking trough -> 2024 recovery surge)
  const macroCyclePoints = useMemo(() => {
    return Array.from({ length: 36 }).map((_, i) => {
      const t = i + 1;
      const norm = (t - 1) / 35; // 0 to 1
      const val = 415000 - 85000 * Math.sin(norm * Math.PI * 0.95) + 38000 * norm;
      return { x: getX(t), y: getY(val) };
    });
  }, []);

  // Noise band upper and lower paths (for Randomness / Irregular component)
  const noiseBandUpperPath = useMemo(() => {
    const pts = FULL_TIME_SERIES.map((r) => ({
      x: getX(r.period),
      y: getY(r.actual + 13000)
    }));
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, []);

  const noiseBandLowerPath = useMemo(() => {
    const pts = FULL_TIME_SERIES.map((r) => ({
      x: getX(r.period),
      y: getY(r.actual - 13000)
    }));
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, []);

  // Full validation ranking models (Exact from Analytical Report Table 2)
  const validationRanking = [
    { rank: 1, name: 'ARIMA (1,1,0)', mae: 20919, rmse: 24426, mape: 4.71, isWinner: true },
    { rank: 2, name: 'ETS α = 0.80', mae: 22952, rmse: 26323, mape: 5.17, isWinner: false },
    { rank: 3, name: 'ETS α = 0.50 (Selected)', mae: 27725, rmse: 33064, mape: 6.22, isWinner: false },
    { rank: 4, name: '3-Period WMA', mae: 28473, rmse: 32962, mape: 6.41, isWinner: false },
    { rank: 5, name: '3-Period SMA', mae: 31927, rmse: 37934, mape: 7.19, isWinner: false },
    { rank: 6, name: 'Random Forest', mae: 37138, rmse: 42988, mape: 8.31, isWinner: false },
    { rank: 7, name: 'Lagged Linear Regression', mae: 37990, rmse: 41559, mape: 8.48, isWinner: false },
    { rank: 8, name: 'ETS α = 0.20', mae: 44787, rmse: 48914, mape: 10.00, isWinner: false },
    { rank: 9, name: 'Trend Projection', mae: 107737, rmse: 108450, mape: 24.15, isWinner: false }
  ];

  // Beat 1 drawing index (for period line draw)
  const beat1DrawIndex = useMemo(() => {
    if (currentBeatIndex !== 1) return 35;
    if (beatElapsedSeconds < 13) return 0;
    if (beatElapsedSeconds < 24) {
      return Math.min(13, Math.floor(((beatElapsedSeconds - 13) / 11) * 14));
    }
    if (beatElapsedSeconds < 27) return 13; // hold at Feb 2023
    return Math.min(35, 13 + Math.floor(((beatElapsedSeconds - 27) / 9) * 23));
  }, [currentBeatIndex, beatElapsedSeconds]);

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden">
      {/* Full Screen Steady Cinema Keynote Stage */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full h-full bg-[#060B14] overflow-hidden select-none flex items-center justify-center transition-all ${
          isFullscreen ? '!fixed !inset-0 !z-50 !w-screen !h-screen !max-w-none !rounded-none !border-none !aspect-auto bg-[#060B14]' : ''
        } ${isTVMode ? 'stage-tv-mode' : ''}`}
      >
        {/* Subtle radial depth gradient in Apple keynote stage style */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            background: 'radial-gradient(circle at 50% 45%, #0B2545 0%, #060B14 85%)'
          }}
        />

        {/* Top-Right Quick Action Toolbar (TV Mode & Fullscreen, 1-Click for TV & Mobile) */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-6 z-50 flex items-center gap-2 pointer-events-auto">
          {/* Quick TV Mode Switcher */}
          <button
            onClick={toggleTVMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border text-[11px] sm:text-xs font-mono font-bold transition-all shadow-xl backdrop-blur-md ${
              isTVMode
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(242,165,65,0.6)]'
                : 'bg-slate-900/85 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
            }`}
            title="Toggle TV / Big Screen Presentation Mode (Press T)"
          >
            <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-current" />
            <span className="hidden sm:inline">{isTVMode ? 'TV Stage: ACTIVE' : 'TV Mode'}</span>
            <span className="sm:hidden">{isTVMode ? 'TV: ON' : 'TV'}</span>
          </button>

          {/* Quick Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded-full bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-xl backdrop-blur-md transition-colors"
            title="Toggle Fullscreen (Press F)"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>

        {/* Floating Notification Toast */}
        <AnimatePresence>
          {videoNotification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-14 sm:top-16 right-3 sm:right-6 z-50 px-4 py-2 bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2 backdrop-blur-md"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{videoNotification}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Steady Full Screen Presentation Viewport */}
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-auto"
        >

        {/* ============================================================== */}
        {/* BEAT 0 (0:00 - 0:25 · 25s): THE HOOK — TITLE AND STUDY CONTEXT */}
        {/* ============================================================== */}
        {currentBeatIndex === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6 md:p-10 overflow-y-auto sm:overflow-hidden pb-24 sm:pb-20 phone-scrollable">
            {/* Cinematic Port Terminal Backdrop */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={PORT_TERMINAL_IMG}
                alt="Port of Los Angeles Terminal"
                className="w-full h-full object-cover brightness-[0.20] contrast-[1.15]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060B14] via-[#060B14]/85 to-[#060B14]/70" />
              <div 
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 50%, #1B6CA8 1.5px, transparent 1.5px)`,
                  backgroundSize: '40px 40px'
                }}
              />
            </div>

            {/* Pixel Ship Forming in Background Visual (Clearly Visible & Fun) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-100">
              <PixelShipVisual opacity={1.0} isFormed={true} className="w-full h-full max-h-[520px]" />
            </div>

            {/* Kinetic Branching Lines Background */}
            <svg viewBox="0 0 1000 500" className="absolute inset-0 w-full h-full pointer-events-none opacity-20 z-10">
              <path d="M 100 250 C 250 250, 300 120, 500 120 C 700 120, 800 250, 900 250" fill="none" stroke="#1B6CA8" strokeWidth="2" strokeDasharray="4 6" />
              <path d="M 100 250 C 250 250, 350 380, 500 380 C 650 380, 750 250, 900 250" fill="none" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="6 6" />
            </svg>

            <div className={`relative z-20 flex flex-col items-center ${isTVMode ? 'max-w-[94vw]' : 'max-w-5xl'} w-full text-center gap-3 sm:gap-5 md:gap-6 my-auto`}>
              {/* Institutional & Title Header */}
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-1.5 sm:space-y-2.5"
              >
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs sm:text-sm font-mono font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(242,165,65,0.25)]">
                  <span className="w-2 h-2 rounded-full bg-[#F2A541]" />
                  <span>APPLIED STUDY 1</span>
                </div>
                <h1 className={`font-light text-white tracking-tight ${isTVMode ? 'text-3xl sm:text-5xl md:text-6xl 2xl:text-7xl' : 'text-2xl sm:text-3xl md:text-5xl'}`}>
                  Real-Data Forecasting Decision Challenge
                </h1>
                <div className={`font-mono text-slate-300 font-medium ${isTVMode ? 'text-sm sm:text-lg 2xl:text-2xl' : 'text-xs sm:text-sm'}`}>
                  IE-PC 3112: Operations Management 1
                </div>
                <div className={`flex flex-wrap items-center justify-center gap-2 sm:gap-3 font-mono text-slate-300 pt-1 ${isTVMode ? 'text-sm sm:text-base 2xl:text-xl' : 'text-[11px] sm:text-xs'}`}>
                  <span className="px-2.5 py-0.5 rounded bg-sky-500/15 border border-sky-400/40 text-sky-400 font-semibold">BSIE 3-E</span>
                  <span className="text-slate-600 hidden sm:inline">|</span>
                  <span className="px-2.5 py-0.5 rounded bg-slate-900/80 border border-slate-700/70 text-slate-200">Cebu Technological University, Main Campus</span>
                  <span className="text-slate-600 hidden sm:inline">|</span>
                  <span className="px-2.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-[#F2A541] font-semibold">Dataset D10: Port of Los Angeles Monthly Exports</span>
                </div>
              </motion.div>

              {/* 3 Speakers Roster (Clean Names Only - 3 Columns on both Mobile & Desktop) */}
              <div className={`grid grid-cols-3 gap-2 sm:gap-3.5 w-full ${isTVMode ? 'max-w-[90vw]' : 'max-w-4xl'}`}>
                {/* Speaker 1 */}
                <div className="p-2.5 sm:p-4 rounded-2xl border bg-slate-950/70 border-sky-400/40 shadow-[0_0_20px_rgba(56,189,248,0.15)] text-center backdrop-blur-md transition-all hover:border-sky-400">
                  <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 font-mono text-sky-400 font-bold uppercase tracking-wider ${isTVMode ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-[11px]'}`}>
                    Speaker 1
                  </div>
                  <div className={`font-bold text-white mt-1.5 sm:mt-2 tracking-wide ${isTVMode ? 'text-base sm:text-xl md:text-2xl 2xl:text-3xl' : 'text-xs sm:text-base md:text-lg'}`}>
                    Elaiza Jane Aligato
                  </div>
                </div>

                {/* Speaker 2 */}
                <div className="p-2.5 sm:p-4 rounded-2xl border bg-slate-950/70 border-amber-400/40 shadow-[0_0_20px_rgba(242,165,65,0.15)] text-center backdrop-blur-md transition-all hover:border-amber-400">
                  <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 font-mono text-[#F2A541] font-bold uppercase tracking-wider ${isTVMode ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-[11px]'}`}>
                    Speaker 2
                  </div>
                  <div className={`font-bold text-white mt-1.5 sm:mt-2 tracking-wide ${isTVMode ? 'text-base sm:text-xl md:text-2xl 2xl:text-3xl' : 'text-xs sm:text-base md:text-lg'}`}>
                    Rash Mae Crystelle C. Ansay
                  </div>
                </div>

                {/* Speaker 3 */}
                <div className="p-2.5 sm:p-4 rounded-2xl border bg-slate-950/70 border-emerald-400/40 shadow-[0_0_20px_rgba(16,185,129,0.15)] text-center backdrop-blur-md transition-all hover:border-emerald-400">
                  <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 font-mono text-emerald-400 font-bold uppercase tracking-wider ${isTVMode ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-[11px]'}`}>
                    Speaker 3
                  </div>
                  <div className={`font-bold text-white mt-1.5 sm:mt-2 tracking-wide ${isTVMode ? 'text-base sm:text-xl md:text-2xl 2xl:text-3xl' : 'text-xs sm:text-base md:text-lg'}`}>
                    Mylene Joy Villagracia
                  </div>
                </div>
              </div>

              {/* Dataset Scope Card */}
              <div className={`w-full ${isTVMode ? 'max-w-[90vw] p-4 sm:p-6' : 'max-w-4xl p-3 sm:p-5'} rounded-2xl bg-slate-950/75 border border-slate-700/80 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-left`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-[#1B6CA8]/30 border border-sky-400/30 text-sky-400">
                    <Ship className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className={`font-mono text-[#F2A541] uppercase tracking-wider font-bold ${isTVMode ? 'text-xs sm:text-base' : 'text-[11px] sm:text-xs'}`}>
                      DATASET D10 · PORT OF LOS ANGELES (POLA) EXPORTS
                    </div>
                    <div className={`text-slate-300 ${isTVMode ? 'text-xs sm:text-sm md:text-base' : 'text-[11px] sm:text-xs'}`}>
                      36 Historical Monthly Observations (Jan 2022 – Dec 2024) · Twenty-Foot Equivalent Units (TEUs)
                    </div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 font-mono text-slate-300 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4 ${isTVMode ? 'text-xs sm:text-sm md:text-base' : 'text-[11px] sm:text-xs'}`}>
                  <span className="text-sky-300 font-semibold">30 Dev Months</span>
                  <span>·</span>
                  <span className="text-amber-300 font-semibold">6 Holdout Months</span>
                </div>
              </div>

              {/* Transition Bar */}
              {beatElapsedSeconds >= 10 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-1 flex items-center justify-center gap-2 text-xs font-mono text-sky-400"
                >
                  <span>NEXT → BEAT 1: THE OPERATIONAL PROBLEM &amp; DATA BEHAVIOR</span>
                  <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* BEAT 1 (0:25 - 1:05 · 40s): REAL WORLD -> DATA (BRANCHING SYNAPSE) */}
        {/* ============================================================== */}
        {currentBeatIndex === 1 && (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            {/* Phase 1a (0s - 3s): Opening shot, physical port environment, no text */}
            {beatElapsedSeconds < 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 1.0 }}
                animate={{ opacity: 1, scale: 1.04 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.8, ease: 'easeOut' }}
                className="absolute inset-0 w-full h-full overflow-hidden"
              >
                <img
                  src={ESTABLISHING_SHOT_IMG}
                  alt="Port of Los Angeles Breakwater"
                  className="w-full h-full object-cover brightness-[0.75] contrast-[1.08]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060B14] via-transparent to-transparent opacity-85" />
              </motion.div>
            )}

            {/* Phase 1b (4s - 9s · cumulative 0:17s - 0:22s): MORPH 1 — Containers morph into glowing data points */}
            {beatElapsedSeconds >= 4 && beatElapsedSeconds < 9 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
              >
                <img
                  src={PORT_TERMINAL_IMG}
                  alt="Port of Los Angeles Terminal"
                  className="w-full h-full object-cover brightness-[0.4] contrast-[1.1] filter blur-[1px]"
                />
                <div className="absolute inset-0 bg-[#060B14]/75" />
                {/* 3D Data Particles Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 1000 500" className="w-full h-full">
                    {Array.from({ length: 36 }).map((_, i) => {
                      const px = 100 + (i * 22) + ((i % 4) * 8);
                      const py = 200 + Math.sin(i * 0.4) * 90;
                      return (
                        <g key={i}>
                          <motion.rect
                            initial={{ width: 24, height: 14, opacity: 0.8, fill: '#1B6CA8' }}
                            animate={{ width: 8, height: 8, opacity: 1, rx: 4, fill: '#38BDF8' }}
                            transition={{ duration: 2.5, delay: i * 0.05 }}
                            x={px}
                            y={py}
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </motion.div>
            )}

            {/* Phase 1c (9s - 21s · cumulative 0:22s - 0:34s): Question Reveal */}
            {beatElapsedSeconds >= 9 && beatElapsedSeconds < 21 && (
              <motion.div
                key="operational-question"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1.0, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -15 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="text-center z-20 max-w-4xl px-6 flex flex-col items-center gap-4"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-mono uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-[#F2A541] animate-ping" />
                  <span>The Operational Problem · Dataset D10</span>
                </div>
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-light text-slate-100 tracking-tight leading-tight">
                  How can you plan effectively if you cannot predict what comes next?
                </h1>
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm font-mono text-slate-400 mt-2">
                  <span className="text-sky-300">May 2022: 466k</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-slate-300">Nov 2022: 327k</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-rose-400 font-bold">Feb 2023 Low: 236k TEUs</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-amber-300 font-mono">r = −0.39</span>
                </div>
              </motion.div>
            )}

            {/* Phase 1d (21s - 28s · cumulative 0:35s - 0:41s): Graph Running with 4 Components Decomposition */}
            {beatElapsedSeconds >= 21 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-8 z-10"
              >
                {/* Top Decomposition Interactive Header & Component Selector */}
                <div className={`w-full ${isTVMode ? 'max-w-[95vw]' : 'max-w-5xl'} flex flex-col sm:flex-row items-center justify-between gap-2.5 mb-2 px-2 text-xs font-mono`}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                    <span className={`text-slate-200 font-bold tracking-wide uppercase ${isTVMode ? 'text-sm sm:text-base' : 'text-xs'}`}>
                      Port of LA Exports (TEUs) · 4 Components
                    </span>
                  </div>

                  {/* 4 Components Interactive Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-950/85 border border-slate-800 backdrop-blur-md shadow-lg">
                    <button
                      onClick={() => setBeat1SelectedComponent(activeBeat1Component === 'all' && beat1SelectedComponent === 'all' ? null : 'all')}
                      className={`rounded-lg font-bold transition-all ${isTVMode ? 'px-3 py-1.5 text-xs sm:text-sm' : 'px-2.5 py-1 text-[10px]'} ${
                        activeBeat1Component === 'all'
                          ? 'bg-slate-800 text-white shadow border border-slate-600'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All 4
                    </button>

                    <button
                      onClick={() => setBeat1SelectedComponent(beat1SelectedComponent === 'trend' ? null : 'trend')}
                      className={`flex items-center gap-1 rounded-lg font-bold transition-all ${isTVMode ? 'px-3 py-1.5 text-xs sm:text-sm' : 'px-2.5 py-1 text-[10px]'} ${
                        activeBeat1Component === 'trend'
                          ? 'bg-sky-500/25 text-sky-300 border border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                          : 'text-slate-400 hover:text-sky-300'
                      }`}
                    >
                      <TrendingUp className="w-3 h-3 text-sky-400" />
                      <span>① Trend (T)</span>
                    </button>

                    <button
                      onClick={() => setBeat1SelectedComponent(beat1SelectedComponent === 'seasonality' ? null : 'seasonality')}
                      className={`flex items-center gap-1 rounded-lg font-bold transition-all ${isTVMode ? 'px-3 py-1.5 text-xs sm:text-sm' : 'px-2.5 py-1 text-[10px]'} ${
                        activeBeat1Component === 'seasonality'
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                          : 'text-slate-400 hover:text-emerald-300'
                      }`}
                    >
                      <Calendar className="w-3 h-3 text-emerald-400" />
                      <span>② Seasonality (S)</span>
                    </button>

                    <button
                      onClick={() => setBeat1SelectedComponent(beat1SelectedComponent === 'cyclicality' ? null : 'cyclicality')}
                      className={`flex items-center gap-1 rounded-lg font-bold transition-all ${isTVMode ? 'px-3 py-1.5 text-xs sm:text-sm' : 'px-2.5 py-1 text-[10px]'} ${
                        activeBeat1Component === 'cyclicality'
                          ? 'bg-purple-500/25 text-purple-300 border border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                          : 'text-slate-400 hover:text-purple-300'
                      }`}
                    >
                      <Waves className="w-3 h-3 text-purple-400" />
                      <span>③ Cyclicality (C)</span>
                    </button>

                    <button
                      onClick={() => setBeat1SelectedComponent(beat1SelectedComponent === 'randomness' ? null : 'randomness')}
                      className={`flex items-center gap-1 rounded-lg font-bold transition-all ${isTVMode ? 'px-3 py-1.5 text-xs sm:text-sm' : 'px-2.5 py-1 text-[10px]'} ${
                        activeBeat1Component === 'randomness'
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-400 shadow-[0_0_12px_rgba(242,165,65,0.4)]'
                          : 'text-slate-400 hover:text-amber-300'
                      }`}
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>④ Randomness (I)</span>
                    </button>
                  </div>
                </div>

                {/* SVG Graph Container */}
                <div className={`relative w-full ${isTVMode ? 'max-w-[95vw] 2xl:max-w-[96vw]' : 'max-w-5xl'} transition-all duration-500 ${activeBeat1Component === 'trend' ? 'h-[78%] md:h-[84%]' : 'h-[65%] md:h-[70%]'}`}>
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="polaAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1B6CA8" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#1B6CA8" stopOpacity="0.0" />
                      </linearGradient>

                      {/* Seasonality Emerald Gradient */}
                      <linearGradient id="seasonGreenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                        <stop offset="50%" stopColor="#10B981" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
                      </linearGradient>

                      {/* Cyclicality Purple Gradient */}
                      <linearGradient id="cyclePurpleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#A855F7" stopOpacity="0.32" />
                        <stop offset="60%" stopColor="#A855F7" stopOpacity="0.10" />
                        <stop offset="100%" stopColor="#A855F7" stopOpacity="0.0" />
                      </linearGradient>

                      {/* Randomness Amber Glow */}
                      <filter id="amberShockGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>

                      {/* Trend Cyan Glow */}
                      <filter id="cyanTrendGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>

                      {/* Seasonality Emerald Glow */}
                      <filter id="emeraldSeasonGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>

                      {/* Cyclicality Purple Glow */}
                      <filter id="purpleCycleGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>

                      {/* High-Impact Laser Neon Glow for Actual Line */}
                      <filter id="laserLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3.5" result="blur1" />
                        <feGaussianBlur stdDeviation="8" result="blur2" />
                        <feMerge>
                          <feMergeNode in="blur2" />
                          <feMergeNode in="blur1" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>

                      {/* Electric Shimmer Area Gradient Under Historical Line */}
                      <linearGradient id="electricAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.25" />
                        <stop offset="60%" stopColor="#0284C7" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#0B2545" stopOpacity="0.0" />
                      </linearGradient>

                      {/* Vertical Scanning Sonar Beam Gradient */}
                      <linearGradient id="sonarScanBeam" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.0" />
                        <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Minimal Horizontal Grid Lines & Values */}
                    {[250000, 350000, 450000].map((v) => (
                      <g key={v}>
                        <line
                          x1={padLeft}
                          y1={getY(v)}
                          x2={padLeft + plotW}
                          y2={getY(v)}
                          stroke="#1E293B"
                          strokeWidth="1"
                          strokeDasharray="4 6"
                        />
                        <text
                          x={padLeft - 10}
                          y={getY(v) + 4}
                          textAnchor="end"
                          fill="#94A3B8"
                          fontSize={isTVMode ? "15" : "11"}
                          fontFamily="monospace"
                        >
                          {v / 1000}k
                        </text>
                      </g>
                    ))}

                    {/* Vertical Year Partition Boundaries */}
                    <line x1={getX(12.5)} y1={padTop} x2={getX(12.5)} y2={padTop + plotH} stroke="#334155" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                    <line x1={getX(24.5)} y1={padTop} x2={getX(24.5)} y2={padTop + plotH} stroke="#334155" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

                    {/* Year Labels at Base of Chart */}
                    <text x={getX(6.5)} y={padTop + plotH + 22} textAnchor="middle" fill="#94A3B8" fontSize={isTVMode ? "15" : "11"} fontFamily="monospace" fontWeight="bold">
                      2022 (Months 1–12)
                    </text>
                    <text x={getX(18.5)} y={padTop + plotH + 22} textAnchor="middle" fill="#94A3B8" fontSize={isTVMode ? "15" : "11"} fontFamily="monospace" fontWeight="bold">
                      2023 (Months 13–24)
                    </text>
                    <text x={getX(30.5)} y={padTop + plotH + 22} textAnchor="middle" fill="#94A3B8" fontSize={isTVMode ? "15" : "11"} fontFamily="monospace" fontWeight="bold">
                      2024 (Months 25–36)
                    </text>

                    {/* ============================================================== */}
                    {/* COMPONENT 2: SEASONALITY (S) — Recurring Annual Q3 Peak Surges  */}
                    {/* ============================================================== */}
                    {((beat1SelectedComponent === 'seasonality' || beat1SelectedComponent === 'all') || 
                      (!beat1SelectedComponent && beatElapsedSeconds >= 18 && (activeBeat1Component === 'all' || activeBeat1Component === 'seasonality'))) && (
                      <g className="transition-opacity duration-700">
                        {/* 2022 Q3 Peak Season Shading (Jul-Oct) */}
                        <rect
                          x={getX(7)}
                          y={padTop}
                          width={getX(10) - getX(7)}
                          height={plotH}
                          fill="url(#seasonGreenGrad)"
                          rx="6"
                        />
                        <g transform={`translate(${(getX(7) + getX(10)) / 2}, ${padTop + 14})`} className="anim-float-badge">
                          <rect x="-42" y="-10" width="84" height="18" rx="4" fill="#064E3B" stroke="#10B981" strokeWidth="1" opacity="0.9" />
                          <text textAnchor="middle" y="3" fill="#6EE7B7" fontSize="9" fontFamily="monospace" fontWeight="bold">
                            Q3 HARVEST
                          </text>
                        </g>

                        {/* 2023 Q3 Peak Season Shading (Jul-Oct) */}
                        <rect
                          x={getX(19)}
                          y={padTop}
                          width={getX(22) - getX(19)}
                          height={plotH}
                          fill="url(#seasonGreenGrad)"
                          rx="6"
                        />
                        <g transform={`translate(${(getX(19) + getX(22)) / 2}, ${padTop + 14})`} className="anim-float-badge">
                          <rect x="-42" y="-10" width="84" height="18" rx="4" fill="#064E3B" stroke="#10B981" strokeWidth="1" opacity="0.9" />
                          <text textAnchor="middle" y="3" fill="#6EE7B7" fontSize="9" fontFamily="monospace" fontWeight="bold">
                            Q3 HARVEST
                          </text>
                        </g>

                        {/* 2024 Q3 Peak Season Shading (Jul-Oct) */}
                        <rect
                          x={getX(31)}
                          y={padTop}
                          width={getX(34) - getX(31)}
                          height={plotH}
                          fill="url(#seasonGreenGrad)"
                          rx="6"
                        />
                        <g transform={`translate(${(getX(31) + getX(34)) / 2}, ${padTop + 14})`} className="anim-float-badge">
                          <rect x="-42" y="-10" width="84" height="18" rx="4" fill="#064E3B" stroke="#10B981" strokeWidth="1" opacity="0.9" />
                          <text textAnchor="middle" y="3" fill="#6EE7B7" fontSize="9" fontFamily="monospace" fontWeight="bold">
                            Q3 HARVEST
                          </text>
                        </g>

                        {/* Peak Pulsing Ripple Rings at Harvest Crests */}
                        {[8, 20, 33].map((mIdx) => {
                          const pt = actualPoints[mIdx - 1];
                          return (
                            <g key={`season-crest-${mIdx}`} transform={`translate(${pt.x}, ${pt.y})`}>
                              <circle r="18" fill="none" stroke="#10B981" strokeWidth="1.5" className="animate-ping opacity-75" />
                              <circle r="10" fill="none" stroke="#34D399" strokeWidth="1.5" className="animate-pulse" />
                              <circle r="5" fill="#34D399" filter="url(#emeraldSeasonGlow)" />
                              <line x1="0" y1="-8" x2="0" y2="-22" stroke="#34D399" strokeWidth="1.5" strokeDasharray="2 2" />
                              <polygon points="-4,-20 0,-27 4,-20" fill="#34D399" />
                            </g>
                          );
                        })}

                        {/* Seasonality Callout Banner */}
                        <g transform={`translate(${getX(19)}, 42)`} className="anim-float-badge">
                          <rect x="-150" y="-14" width="300" height="28" rx="8" fill="#064E3B" stroke="#34D399" strokeWidth="1.5" opacity="0.95" filter="url(#emeraldSeasonGlow)" />
                          <circle cx="-132" cy="0" r="5" fill="#34D399" className="animate-ping" />
                          <circle cx="-132" cy="0" r="3.5" fill="#10B981" />
                          <text textAnchor="middle" x="10" y="4" fill="#A7F3D0" fontSize="11" fontFamily="monospace" fontWeight="bold">
                            ② SEASONALITY (S): Annual Q3 Harvest Peaks
                          </text>
                        </g>
                      </g>
                    )}

                    {/* ============================================================== */}
                    {/* COMPONENT 3: CYCLICALITY (C) — Multi-Year Macro Trade Waves    */}
                    {/* ============================================================== */}
                    {((beat1SelectedComponent === 'cyclicality' || beat1SelectedComponent === 'all') || 
                      (!beat1SelectedComponent && beatElapsedSeconds >= 22 && (activeBeat1Component === 'all' || activeBeat1Component === 'cyclicality'))) && (
                      <g className="transition-opacity duration-700">
                        {/* Shaded Macro Cycle Under-Fill */}
                        <path
                          d={`${toPath(macroCyclePoints)} L ${getX(36)} ${padTop + plotH} L ${getX(1)} ${padTop + plotH} Z`}
                          fill="url(#cyclePurpleGrad)"
                          opacity="0.35"
                        />
                        {/* Macro Cycle Trajectory Line with animated dashed flow */}
                        <path
                          d={toPath(macroCyclePoints)}
                          fill="none"
                          stroke="#C084FC"
                          strokeWidth="6"
                          opacity="0.3"
                          filter="url(#purpleCycleGlow)"
                        />
                        <path
                          d={toPath(macroCyclePoints)}
                          fill="none"
                          stroke="#A855F7"
                          strokeWidth="3.5"
                          strokeDasharray="8 5"
                          strokeLinecap="round"
                          className="anim-flow-cycle"
                        />

                        {/* Macro Trough Marker at 2023 Destocking Bottom */}
                        <g transform={`translate(${getX(17)}, ${getY(350000)})`}>
                          <circle r="22" fill="none" stroke="#C084FC" strokeWidth="1.5" className="animate-ping opacity-60" />
                          <circle r="14" fill="none" stroke="#A855F7" strokeWidth="1.5" className="animate-pulse" />
                          <circle r="7" fill="#C084FC" filter="url(#purpleCycleGlow)" />
                        </g>

                        {/* Macro Wave Crest Marker at 2022 Pre-Drop High */}
                        <g transform={`translate(${getX(5)}, ${getY(415000)})`}>
                          <circle r="12" fill="none" stroke="#C084FC" strokeWidth="1.2" className="animate-pulse" />
                          <circle r="5" fill="#A855F7" />
                        </g>

                        {/* Cyclicality Callout Banner */}
                        <g transform={`translate(${getX(10)}, ${getY(310000)})`} className="anim-float-badge">
                          <rect x="-155" y="-14" width="310" height="28" rx="8" fill="#3B0764" stroke="#C084FC" strokeWidth="1.5" opacity="0.95" filter="url(#purpleCycleGlow)" />
                          <circle cx="-137" cy="0" r="5" fill="#C084FC" className="animate-ping" />
                          <circle cx="-137" cy="0" r="3.5" fill="#A855F7" />
                          <text textAnchor="middle" x="10" y="4" fill="#F3E8FF" fontSize="11" fontFamily="monospace" fontWeight="bold">
                            ③ CYCLICALITY (C): Multi-Year Trade Waves
                          </text>
                        </g>
                      </g>
                    )}

                    {/* ============================================================== */}
                    {/* COMPONENT 1: TREND (T) — Linear Downward Slope (r = -0.39)   */}
                    {/* ============================================================== */}
                    {(activeBeat1Component === 'all' || activeBeat1Component === 'trend') && (
                      <g className="transition-opacity duration-700">
                        {/* Glow Halo around Trend line */}
                        <line
                          x1={getX(1)}
                          y1={getY(FULL_TIME_SERIES[0].trend || 409404)}
                          x2={getX(36)}
                          y2={getY(FULL_TIME_SERIES[35].trend || 331833)}
                          stroke="#38BDF8"
                          strokeWidth="8"
                          opacity="0.35"
                          filter="url(#cyanTrendGlow)"
                        />
                        {/* Animated Crisp Dashed Regression Vector with flowing dash */}
                        <line
                          x1={getX(1)}
                          y1={getY(FULL_TIME_SERIES[0].trend || 409404)}
                          x2={getX(36)}
                          y2={getY(FULL_TIME_SERIES[35].trend || 331833)}
                          stroke="#38BDF8"
                          strokeWidth="3.2"
                          strokeDasharray="8 5"
                          strokeLinecap="round"
                          className="anim-flow-trend"
                        />

                        {/* Start Anchor Node on Trend Line */}
                        <g transform={`translate(${getX(1)}, ${getY(FULL_TIME_SERIES[0].trend || 409404)})`}>
                          <circle r="5" fill="#38BDF8" filter="url(#cyanTrendGlow)" />
                        </g>

                        {/* Downward Direction Arrow at end of Trend line with pulsing radar */}
                        <g transform={`translate(${getX(36)}, ${getY(FULL_TIME_SERIES[35].trend || 331833)})`}>
                          <circle r="14" fill="none" stroke="#38BDF8" strokeWidth="1.5" className="animate-ping opacity-75" />
                          <circle r="7" fill="#38BDF8" filter="url(#cyanTrendGlow)" />
                          <path d="M -4 -8 L 4 0 L -4 8" fill="none" stroke="#0B2545" strokeWidth="2.5" />
                        </g>

                        {/* Trend Callout Badge */}
                        <g transform={`translate(${getX(22)}, ${getY(362000) - 25})`} className="anim-float-badge">
                          <rect x="-160" y="-14" width="320" height="28" rx="8" fill="#0B2545" stroke="#38BDF8" strokeWidth="1.5" opacity="0.95" filter="url(#cyanTrendGlow)" />
                          <circle cx="-142" cy="0" r="5" fill="#38BDF8" className="animate-ping" />
                          <circle cx="-142" cy="0" r="3.5" fill="#0284C7" />
                          <text textAnchor="middle" x="8" y="4" fill="#BAE6FD" fontSize="11" fontFamily="monospace" fontWeight="bold">
                            ① TREND (T): Linear Trend Fit (r = −0.39)
                          </text>
                        </g>
                      </g>
                    )}

                    {/* ============================================================== */}
                    {/* COMPONENT 4: RANDOMNESS / IRREGULAR (I) — Anomaly & Noise Band */}
                    {/* ============================================================== */}
                    {((beat1SelectedComponent === 'randomness' || beat1SelectedComponent === 'all') || 
                      (!beat1SelectedComponent && beatElapsedSeconds >= 26 && (activeBeat1Component === 'all' || activeBeat1Component === 'randomness'))) && (
                      <g className="transition-opacity duration-700">
                        {/* Shaded Translucent Uncertainty / Noise Band Envelope */}
                        <path
                          d={`${noiseBandUpperPath} L ${actualPoints.slice().reverse().map(p => `${p.x.toFixed(1)} ${(p.y + 13000 * (plotH / (maxVal - minVal))).toFixed(1)}`).join(' L ')} Z`}
                          fill="#F59E0B"
                          opacity="0.08"
                        />
                        {/* Translucent Uncertainty / Noise Ribbon around curve */}
                        <path
                          d={noiseBandUpperPath}
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="1.4"
                          strokeDasharray="4 3"
                          opacity="0.6"
                          className="anim-flow-trend"
                        />
                        <path
                          d={noiseBandLowerPath}
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="1.4"
                          strokeDasharray="4 3"
                          opacity="0.6"
                          className="anim-flow-trend"
                        />

                        {/* Vertical Drop Plumb Line at Feb 2023 Structural Shock */}
                        <line
                          x1={getX(14)}
                          y1={getY(347493)}
                          x2={getX(14)}
                          y2={getY(236264)}
                          stroke="#F2A541"
                          strokeWidth="2.5"
                          strokeDasharray="5 3"
                          className="anim-flow-trend"
                        />

                        {/* Pulsing Target Radar Circles on Feb 2023 Shock with double echo ring */}
                        <g transform={`translate(${getX(14)}, ${getY(236264)})`}>
                          <circle r="34" fill="none" stroke="#F2A541" strokeWidth="1.5" className="animate-ping opacity-60" />
                          <circle r="22" fill="none" stroke="#F59E0B" strokeWidth="1.5" className="animate-pulse opacity-80" />
                          <circle r="12" fill="none" stroke="#FDE68A" strokeWidth="1.5" className="animate-ping opacity-90" />
                          <circle r="7" fill="#F2A541" filter="url(#amberShockGlow)" />
                        </g>

                        {/* Shock Origin Dot before the Drop (Jan 2023: 347,493) */}
                        <g transform={`translate(${getX(14)}, ${getY(347493)})`}>
                          <circle r="4" fill="#F59E0B" opacity="0.8" />
                          <text x="10" y="4" fill="#FCD34D" fontSize="9" fontFamily="monospace" fontWeight="bold">
                            Pre-Shock Baseline
                          </text>
                        </g>

                        {/* Shock Callout Badge with Exact Drop - Positioned above point for perfect clearance */}
                        <g transform={`translate(${getX(14)}, ${getY(236264) - 46})`} className="anim-float-badge">
                          <rect x="-155" y="-14" width="310" height="28" rx="8" fill="#451A03" stroke="#F59E0B" strokeWidth="1.5" opacity="0.95" filter="url(#amberShockGlow)" />
                          <circle cx="-137" cy="0" r="5" fill="#F59E0B" className="animate-ping" />
                          <circle cx="-137" cy="0" r="3.5" fill="#D97706" />
                          <text textAnchor="middle" x="8" y="4" fill="#FEF3C7" fontSize="11" fontFamily="monospace" fontWeight="bold">
                            ④ RANDOMNESS (I): Feb 2023 Shock (−32.0%)
                          </text>
                          {/* Downward indicator tick pointing straight to the shock drop */}
                          <polygon points="-5,14 0,22 5,14" fill="#F59E0B" />
                        </g>
                      </g>
                    )}

                    {/* Dynamic Moving Sonar Radar Beam traversing the chart */}
                    <g className="pointer-events-none anim-radar-sweep">
                      <rect
                        x={padLeft}
                        y={padTop}
                        width="45"
                        height={plotH}
                        fill="url(#sonarScanBeam)"
                      />
                      <line
                        x1={padLeft + 22}
                        y1={padTop}
                        x2={padLeft + 22}
                        y2={padTop + plotH}
                        stroke="#38BDF8"
                        strokeWidth="1.2"
                        strokeDasharray="2 3"
                        opacity="0.7"
                      />
                    </g>

                    {/* Luminous Shaded Area Underneath Actual Trajectory */}
                    {beat1DrawIndex > 0 && (
                      <path
                        d={`${actualPoints.slice(0, beat1DrawIndex + 1).map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ')} L ${actualPoints[beat1DrawIndex].x.toFixed(1)} ${padTop + plotH} L ${actualPoints[0].x.toFixed(1)} ${padTop + plotH} Z`}
                        fill="url(#electricAreaGrad)"
                      />
                    )}

                    {/* Actual Historical Line - Deep Cyan Neon Laser Halo */}
                    {beat1DrawIndex > 0 && (
                      <path
                        d={actualPoints.slice(0, beat1DrawIndex + 1).map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ')}
                        fill="none"
                        stroke="#0284C7"
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.45"
                        filter="url(#laserLineGlow)"
                      />
                    )}

                    {/* Actual Historical Line - Crisp White Core with Laser Radiance */}
                    {beat1DrawIndex > 0 && (
                      <path
                        d={actualPoints.slice(0, beat1DrawIndex + 1).map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ')}
                        fill="none"
                        stroke="#F0F9FF"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="anim-laser-line"
                      />
                    )}

                    {/* Interactive Animated Data Nodes Along the Path */}
                    {beat1DrawIndex > 0 &&
                      actualPoints.slice(0, beat1DrawIndex + 1).map((pt, idx) => {
                        const isLatest = idx === beat1DrawIndex;
                        const isHarvestPeak = [7, 19, 32].includes(idx); // Q3 crests
                        const isShockDrop = idx === 13; // Feb 2023
                        return (
                          <g key={`data-node-${idx}`} transform={`translate(${pt.x}, ${pt.y})`}>
                            {/* Outer pulsating halo on key points */}
                            {(isLatest || isHarvestPeak || isShockDrop) && (
                              <circle
                                r={isShockDrop ? "14" : isHarvestPeak ? "12" : "10"}
                                fill="none"
                                stroke={isShockDrop ? "#F59E0B" : isHarvestPeak ? "#10B981" : "#38BDF8"}
                                strokeWidth="1.5"
                                className="animate-ping opacity-60"
                              />
                            )}
                            {/* Inner crisp core dot */}
                            <circle
                              r={isLatest ? "5.5" : "3.5"}
                              fill={isShockDrop ? "#F59E0B" : isHarvestPeak ? "#34D399" : "#38BDF8"}
                              stroke="#FFFFFF"
                              strokeWidth={isLatest ? "2" : "1.2"}
                              filter="url(#cyanTrendGlow)"
                            />
                            {/* Current active leading tracer badge */}
                            {isLatest && (
                              <g transform="translate(0, -20)" className="anim-float-badge">
                                <rect
                                  x="-45"
                                  y="-9"
                                  width="90"
                                  height="18"
                                  rx="5"
                                  fill="#0B2545"
                                  stroke="#38BDF8"
                                  strokeWidth="1.2"
                                  filter="url(#cyanTrendGlow)"
                                />
                                <text
                                  textAnchor="middle"
                                  y="3.5"
                                  fill="#E0F2FE"
                                  fontSize="9"
                                  fontFamily="monospace"
                                  fontWeight="bold"
                                >
                                  {pt.val.toLocaleString()}
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                   </svg>
                </div>

                {/* Bottom Detail Summary Bar: omitted during trend projection so only the moving graph remains */}
                {activeBeat1Component !== 'trend' && (
                  <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-900/80 text-[10px] font-mono">
                    {/* Seasonality: Only show once its turn arrives in the beat timeline (18s+) or if selected */}
                    {(beat1SelectedComponent === 'seasonality' || beat1SelectedComponent === 'all' || (!beat1SelectedComponent && beatElapsedSeconds >= 18)) ? (
                      <div className={`p-2 rounded-xl border transition-all ${
                        activeBeat1Component === 'seasonality' || activeBeat1Component === 'all'
                          ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                          : 'bg-slate-950/40 border-slate-900 text-slate-500'
                      }`}>
                        <div className="font-bold flex items-center gap-1 text-emerald-400">
                          <Calendar className="w-3 h-3" />
                          <span>SEASONALITY (S)</span>
                        </div>
                        <div className="truncate mt-0.5">Recurring Q3 Harvest Peak Surges</div>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl border border-slate-900/40 bg-slate-950/20 text-slate-600 flex flex-col justify-center items-center opacity-40">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>② SEASONALITY</span>
                        </div>
                        <div className="text-[9px] mt-0.5 text-slate-600">Pending breakdown...</div>
                      </div>
                    )}

                    {/* Cyclicality: Only show once its turn arrives in the beat timeline (22s+) or if selected */}
                    {(beat1SelectedComponent === 'cyclicality' || beat1SelectedComponent === 'all' || (!beat1SelectedComponent && beatElapsedSeconds >= 22)) ? (
                      <div className={`p-2 rounded-xl border transition-all ${
                        activeBeat1Component === 'cyclicality' || activeBeat1Component === 'all'
                          ? 'bg-purple-950/50 border-purple-500/40 text-purple-200'
                          : 'bg-slate-950/40 border-slate-900 text-slate-500'
                      }`}>
                        <div className="font-bold flex items-center gap-1 text-purple-400">
                          <Waves className="w-3 h-3" />
                          <span>CYCLICALITY (C)</span>
                        </div>
                        <div className="truncate mt-0.5">Multi-Year Destocking &amp; Rebound</div>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl border border-slate-900/40 bg-slate-950/20 text-slate-600 flex flex-col justify-center items-center opacity-40">
                        <div className="flex items-center gap-1">
                          <Waves className="w-3 h-3" />
                          <span>③ CYCLICALITY</span>
                        </div>
                        <div className="text-[9px] mt-0.5 text-slate-600">Pending breakdown...</div>
                      </div>
                    )}

                    {/* Randomness: Only show once its turn arrives in the beat timeline (26s+) or if selected */}
                    {(beat1SelectedComponent === 'randomness' || beat1SelectedComponent === 'all' || (!beat1SelectedComponent && beatElapsedSeconds >= 26)) ? (
                      <div className={`p-2 rounded-xl border transition-all ${
                        activeBeat1Component === 'randomness' || activeBeat1Component === 'all'
                          ? 'bg-amber-950/50 border-amber-500/40 text-amber-200'
                          : 'bg-slate-950/40 border-slate-900 text-slate-500'
                      }`}>
                        <div className="font-bold flex items-center gap-1 text-amber-400">
                          <Zap className="w-3 h-3" />
                          <span>RANDOMNESS (I)</span>
                        </div>
                        <div className="truncate mt-0.5">Feb 2023 −32% Shock &amp; Residuals</div>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl border border-slate-900/40 bg-slate-950/20 text-slate-600 flex flex-col justify-center items-center opacity-40">
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>④ RANDOMNESS</span>
                        </div>
                        <div className="text-[9px] mt-0.5 text-slate-600">Pending breakdown...</div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Phase 1e (32s - 40s): Chart completely exits, leaving only r = −0.39 in clean keynote typography */}
            {beatElapsedSeconds >= 32 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1.0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#060B14]/95 backdrop-blur-xl gap-4 p-8"
              >
                <div className="text-7xl md:text-9xl font-extralight text-slate-100 tracking-wider filter drop-shadow-[0_0_35px_rgba(56,189,248,0.3)]">
                  r = −0.39
                </div>
                <div className="text-xs md:text-sm font-mono tracking-[0.25em] uppercase text-sky-400 font-semibold bg-sky-950/60 px-4 py-1.5 rounded-full border border-sky-500/30">
                  Downward Linear Drift · No Steady Trend
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* BEAT 2 (1:05 - 1:40 · 35s): CONVENTIONAL MODEL (ROCK-STEADY PRESENTATION) */}
        {/* Top-Left: SMA | Top-Right: WMA | Bottom-Left: ETS | Bottom-Right: SLR */}
        {/* ============================================================== */}
        {currentBeatIndex === 2 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 sm:p-5 md:p-6 z-10 overflow-hidden">
            {/* Subtle Terminal Background Photo */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <img src={CONTAINER_YARD_IMG} alt="Container Yard Twilight" className="w-full h-full object-cover" />
            </div>

            {/* Apple Keynote Minimalist Header */}
            <div className="relative z-20 mb-2 sm:mb-3 flex flex-col items-center gap-1.5 text-center">
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-light tracking-[0.25em] uppercase text-slate-100">
                  CONVENTIONAL MODEL
                </h2>
                <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-300">
                  DEVELOPMENT STAGE · PERIODS 1–30
                </span>
              </div>
              {/* Minimalist interactive view toggles for presenter */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setManualSolo('grid')}
                  className={`text-[11px] sm:text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                    activeConventionalView === 'grid'
                      ? 'bg-slate-800 text-slate-100 border-slate-600 shadow font-semibold'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  4 in One Frame (Grid)
                </button>
                <button
                  onClick={() => setManualSolo('overlap')}
                  className={`text-[11px] sm:text-xs font-mono uppercase tracking-wider px-3.5 py-1.5 rounded-lg border transition-all ${
                    activeConventionalView === 'overlap'
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-[0_0_15px_rgba(242,165,65,0.4)]'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                  }`}
                >
                  Overlapped Comparison
                </button>
              </div>
            </div>

            {/* 4-Panel Grid: Stationary, Perfectly Aligned 2x2 Matrix (Periods 1-30 only) */}
            {activeConventionalView === 'grid' && (
              <div className={`relative z-10 w-full h-full ${isTVMode ? 'max-w-[96vw] 2xl:max-w-[96vw] max-h-[85vh] gap-3 sm:gap-5' : 'max-w-6xl max-h-[78vh] gap-2.5 sm:gap-4'} grid grid-cols-1 sm:grid-cols-2`}>
              
              {/* TOP LEFT: SMA */}
              <div
                className="relative flex flex-col rounded-2xl bg-slate-950/85 border border-slate-800/80 p-2.5 sm:p-4 shadow-xl backdrop-blur-md overflow-hidden"
              >
                <div className="flex items-center justify-between mb-1 px-1 z-10">
                  <h3 className={`font-light tracking-wider text-slate-100 ${isTVMode ? 'text-2xl sm:text-3xl 2xl:text-4xl' : 'text-lg sm:text-2xl'}`}>SMA</h3>
                  <span className={`font-mono text-sky-400 ${isTVMode ? 'text-sm sm:text-base 2xl:text-lg font-bold' : 'text-xs'}`}>MAE: 33,428</span>
                </div>
                <div className="flex-1 relative w-full h-full min-h-0">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="smaAreaGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                      </linearGradient>
                      <filter id="smaGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <clipPath id="smaGridClip">
                        <rect x={0} y={0} width={gridHeadSma.x} height={svgHeight} />
                      </clipPath>
                    </defs>

                    {/* Y Ticks & Gridlines (Aligned to Y-Axis) */}
                    {[250000, 350000, 450000].map(v => (
                      <g key={v}>
                        <line x1={padLeft} y1={getY(v)} x2={padLeft + plotW} y2={getY(v)} stroke="#334155" strokeDasharray="4 4" strokeOpacity="0.6" />
                        <text x={padLeft - 8} y={getY(v) + 4} textAnchor="end" fill="#94A3B8" fontSize={isTVMode ? "17" : "14"} fontFamily="monospace" fontWeight="500">
                          {v / 1000}k
                        </text>
                      </g>
                    ))}

                    {/* Y-Axis Line & X-Axis Baseline */}
                    <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke="#475569" strokeWidth={isTVMode ? "2.5" : "1.8"} />
                    <line x1={padLeft} y1={padTop + plotH} x2={padLeft + plotW} y2={padTop + plotH} stroke="#475569" strokeWidth={isTVMode ? "2.5" : "1.8"} />
                    <text x={padLeft - 8} y={padTop - 8} textAnchor="end" fill="#94A3B8" fontSize={isTVMode ? "15" : "12"} fontFamily="monospace">
                      TEUs
                    </text>

                    {/* Mini Legend */}
                    <g transform={`translate(${padLeft + plotW - 130}, ${padTop - 8})`}>
                      <line x1="0" y1="0" x2="16" y2="0" stroke="#94A3B8" strokeWidth={isTVMode ? "3" : "2"} strokeDasharray="3 2" />
                      <text x="22" y="3" fill="#94A3B8" fontSize={isTVMode ? "15" : "12"} fontFamily="monospace">Actual</text>
                      <line x1="68" y1="0" x2="84" y2="0" stroke="#38BDF8" strokeWidth={isTVMode ? "4" : "2.8"} />
                      <text x="90" y="3" fill="#38BDF8" fontSize={isTVMode ? "15" : "12"} fontFamily="monospace">SMA</text>
                    </g>

                    {/* X Ticks (Periods 1-30) */}
                    {devTicks.map(t => (
                      <text key={t.period} x={getDevX(t.period)} y={padTop + plotH + 22} textAnchor="middle" fill="#94A3B8" fontSize={isTVMode ? "16" : "13"} fontFamily="monospace">
                        {t.label}
                      </text>
                    ))}

                    {/* Actual Series Reference Aligned to Y-Axis (Periods 1-30) */}
                    <path d={devActualPath} fill="none" stroke="#94A3B8" strokeWidth={isTVMode ? "3" : "2"} strokeDasharray="4 3" strokeOpacity="0.85" />

                    {/* Shaded Area */}
                    <path
                      d={`${toPath(devSmaPoints)} L ${devSmaPoints[devSmaPoints.length - 1].x} ${padTop + plotH} L ${devSmaPoints[0].x} ${padTop + plotH} Z`}
                      fill="url(#smaAreaGrad2)"
                      clipPath="url(#smaGridClip)"
                    />

                    {/* Glowing Aura Line */}
                    <path
                      d={toPath(devSmaPoints)}
                      fill="none"
                      stroke="#0284C7"
                      strokeWidth={isTVMode ? "10" : "7"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.35"
                      filter="url(#smaGlow)"
                      style={{
                        strokeDasharray: 1400,
                        strokeDashoffset: 1400 * (1 - gridProgress)
                      }}
                    />

                    {/* Neon Laser Line */}
                    <path
                      d={toPath(devSmaPoints)}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth={isTVMode ? "4.5" : "3.2"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: 1400,
                        strokeDashoffset: 1400 * (1 - gridProgress)
                      }}
                      className="filter drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]"
                    />

                    {/* Steady Head Beacon */}
                    <g transform={`translate(${gridHeadSma.x}, ${gridHeadSma.y})`}>
                      <circle r={isTVMode ? "7" : "5"} fill="#38BDF8" opacity="0.4" />
                      <circle r={isTVMode ? "5" : "3.5"} fill="#38BDF8" />
                      <circle r="1.5" fill="#FFFFFF" />
                    </g>
                  </svg>
                </div>
              </div>

              {/* TOP RIGHT: WMA */}
              <div
                className="relative flex flex-col rounded-2xl bg-slate-950/85 border border-slate-800/80 p-2.5 sm:p-4 shadow-xl backdrop-blur-md overflow-hidden"
              >
                <div className="flex items-center justify-between mb-1 px-1 z-10">
                  <h3 className={`font-light tracking-wider text-slate-100 ${isTVMode ? 'text-2xl sm:text-3xl 2xl:text-4xl' : 'text-lg sm:text-2xl'}`}>WMA</h3>
                  <span className={`font-mono text-emerald-400 ${isTVMode ? 'text-sm sm:text-base 2xl:text-lg font-bold' : 'text-xs'}`}>MAE: 32,142</span>
                </div>
                <div className="flex-1 relative w-full h-full min-h-0">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="wmaAreaGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                      <filter id="wmaGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <clipPath id="wmaGridClip">
                        <rect x={0} y={0} width={gridHeadWma.x} height={svgHeight} />
                      </clipPath>
                    </defs>

                    {/* Y Ticks & Gridlines (Aligned to Y-Axis) */}
                    {[250000, 350000, 450000].map(v => (
                      <g key={v}>
                        <line x1={padLeft} y1={getY(v)} x2={padLeft + plotW} y2={getY(v)} stroke="#334155" strokeDasharray="4 4" strokeOpacity="0.6" />
                        <text x={padLeft - 8} y={getY(v) + 4} textAnchor="end" fill="#94A3B8" fontSize={isTVMode ? "17" : "14"} fontFamily="monospace" fontWeight="500">
                          {v / 1000}k
                        </text>
                      </g>
                    ))}

                    {/* Y-Axis Line & X-Axis Baseline */}
                    <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke="#475569" strokeWidth={isTVMode ? "2.5" : "1.8"} />
                    <line x1={padLeft} y1={padTop + plotH} x2={padLeft + plotW} y2={padTop + plotH} stroke="#475569" strokeWidth={isTVMode ? "2.5" : "1.8"} />
                    <text x={padLeft - 8} y={padTop - 8} textAnchor="end" fill="#94A3B8" fontSize={isTVMode ? "15" : "12"} fontFamily="monospace">
                      TEUs
                    </text>

                    {/* Mini Legend */}
                    <g transform={`translate(${padLeft + plotW - 130}, ${padTop - 8})`}>
                      <line x1="0" y1="0" x2="16" y2="0" stroke="#94A3B8" strokeWidth={isTVMode ? "3" : "2"} strokeDasharray="3 2" />
                      <text x="22" y="3" fill="#94A3B8" fontSize={isTVMode ? "15" : "12"} fontFamily="monospace">Actual</text>
                      <line x1="68" y1="0" x2="84" y2="0" stroke="#10B981" strokeWidth={isTVMode ? "4" : "2.8"} />
                      <text x="90" y="3" fill="#10B981" fontSize={isTVMode ? "15" : "12"} fontFamily="monospace">WMA</text>
                    </g>

                    {/* X Ticks (Periods 1-30) */}
                    {devTicks.map(t => (
                      <text key={t.period} x={getDevX(t.period)} y={padTop + plotH + 22} textAnchor="middle" fill="#94A3B8" fontSize={isTVMode ? "16" : "13"} fontFamily="monospace">
                        {t.label}
                      </text>
                    ))}

                    {/* Actual Series Reference Aligned to Y-Axis (Periods 1-30) */}
                    <path d={devActualPath} fill="none" stroke="#94A3B8" strokeWidth={isTVMode ? "3" : "2"} strokeDasharray="4 3" strokeOpacity="0.85" />

                    {/* Shaded Area */}
                    <path
                      d={`${toPath(devWmaPoints)} L ${devWmaPoints[devWmaPoints.length - 1].x} ${padTop + plotH} L ${devWmaPoints[0].x} ${padTop + plotH} Z`}
                      fill="url(#wmaAreaGrad2)"
                      clipPath="url(#wmaGridClip)"
                    />

                    {/* Glowing Aura Line */}
                    <path
                      d={toPath(devWmaPoints)}
                      fill="none"
                      stroke="#059669"
                      strokeWidth={isTVMode ? "10" : "7"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.35"
                      filter="url(#wmaGlow)"
                      style={{
                        strokeDasharray: 1400,
                        strokeDashoffset: 1400 * (1 - gridProgress)
                      }}
                    />

                    {/* Neon Laser Line */}
                    <path
                      d={toPath(devWmaPoints)}
                      fill="none"
                      stroke="#34D399"
                      strokeWidth={isTVMode ? "4.5" : "3.2"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: 1400,
                        strokeDashoffset: 1400 * (1 - gridProgress)
                      }}
                      className="filter drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                    />

                    {/* Steady Head Beacon */}
                    <g transform={`translate(${gridHeadWma.x}, ${gridHeadWma.y})`}>
                      <circle r={isTVMode ? "7" : "5"} fill="#34D399" opacity="0.4" />
                      <circle r={isTVMode ? "5" : "3.5"} fill="#34D399" />
                      <circle r="1.5" fill="#FFFFFF" />
                    </g>
                  </svg>
                </div>
              </div>

              {/* BOTTOM LEFT: ETS (α=0.20, α=0.50, α=0.80) */}
              <div
                className="relative flex flex-col rounded-2xl bg-slate-950/85 border border-slate-800/80 p-2.5 sm:p-4 shadow-xl backdrop-blur-md overflow-hidden"
              >
                <div className="flex items-center justify-between mb-1 px-1 z-10">
                  <h3 className={`font-light tracking-wider text-slate-100 ${isTVMode ? 'text-2xl sm:text-3xl 2xl:text-4xl' : 'text-lg sm:text-2xl'}`}>ETS</h3>
                  <div className={`flex items-center gap-1.5 sm:gap-2.5 font-mono tracking-wider ${isTVMode ? 'text-xs sm:text-sm 2xl:text-base font-bold' : 'text-xs'}`}>
                    <span className="text-sky-300">α0.20: 32k</span>
                    <span className="text-[#F2A541] font-semibold">α0.50: 30,596</span>
                    <span className="text-orange-400">α0.80: 32k</span>
                  </div>
                </div>
                <div className="flex-1 relative w-full h-full min-h-0">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="etsAreaGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                      </linearGradient>
                      <filter id="etsGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <clipPath id="etsGridClip">
                        <rect x={0} y={0} width={gridHeadEts05.x} height={svgHeight} />
                      </clipPath>
                    </defs>

                    {/* Y Ticks & Gridlines (Aligned to Y-Axis) */}
                    {[250000, 350000, 450000].map(v => (
                      <g key={v}>
                        <line x1={padLeft} y1={getY(v)} x2={padLeft + plotW} y2={getY(v)} stroke="#334155" strokeDasharray="4 4" strokeOpacity="0.6" />
                        <text x={padLeft - 8} y={getY(v) + 4} textAnchor="end" fill="#94A3B8" fontSize={isTVMode ? "17" : "14"} fontFamily="monospace" fontWeight="500">
                          {v / 1000}k
                        </text>
                      </g>
                    ))}

                    {/* Y-Axis Line & X-Axis Baseline */}
                    <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke="#475569" strokeWidth={isTVMode ? "2.5" : "1.8"} />
                    <line x1={padLeft} y1={padTop + plotH} x2={padLeft + plotW} y2={padTop + plotH} stroke="#475569" strokeWidth={isTVMode ? "2.5" : "1.8"} />
                    <text x={padLeft - 8} y={padTop - 8} textAnchor="end" fill="#94A3B8" fontSize={isTVMode ? "15" : "12"} fontFamily="monospace">
                      TEUs
                    </text>

                    {/* Mini Legend */}
                    <g transform={`translate(${padLeft + plotW - 130}, ${padTop - 8})`}>
                      <line x1="0" y1="0" x2="16" y2="0" stroke="#94A3B8" strokeWidth={isTVMode ? "3" : "2"} strokeDasharray="3 2" />
                      <text x="22" y="3" fill="#94A3B8" fontSize={isTVMode ? "15" : "12"} fontFamily="monospace">Actual</text>
                      <line x1="68" y1="0" x2="84" y2="0" stroke="#F2A541" strokeWidth={isTVMode ? "4" : "2.8"} />
                      <text x="90" y="3" fill="#F2A541" fontSize={isTVMode ? "15" : "12"} fontFamily="monospace">ETS</text>
                    </g>

                    {/* X Ticks (Periods 1-30) */}
                    {devTicks.map(t => (
                      <text key={t.period} x={getDevX(t.period)} y={padTop + plotH + 22} textAnchor="middle" fill="#94A3B8" fontSize={isTVMode ? "16" : "13"} fontFamily="monospace">
                        {t.label}
                      </text>
                    ))}

                    {/* Actual Series Reference Aligned to Y-Axis (Periods 1-30) */}
                    <path d={devActualPath} fill="none" stroke="#94A3B8" strokeWidth={isTVMode ? "3" : "2"} strokeDasharray="4 3" strokeOpacity="0.85" />

                    {/* Shaded Area Underneath α=0.50 Baseline */}
                    <path
                      d={`${toPath(devEs05Points)} L ${devEs05Points[devEs05Points.length - 1].x} ${padTop + plotH} L ${devEs05Points[0].x} ${padTop + plotH} Z`}
                      fill="url(#etsAreaGrad2)"
                      clipPath="url(#etsGridClip)"
                    />

                    {/* Curve 1: α = 0.20 */}
                    <path
                      d={toPath(devEs02Points)}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth={isTVMode ? "2.5" : "1.8"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeOpacity="0.6"
                      style={{
                        strokeDasharray: 1400,
                        strokeDashoffset: 1400 * (1 - gridProgress)
                      }}
                    />

                    {/* Curve 3: α = 0.80 */}
                    <path
                      d={toPath(devEs08Points)}
                      fill="none"
                      stroke="#FB923C"
                      strokeWidth={isTVMode ? "2.5" : "1.8"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeOpacity="0.7"
                      style={{
                        strokeDasharray: 1400,
                        strokeDashoffset: 1400 * (1 - gridProgress)
                      }}
                    />

                    {/* Curve 2: α = 0.50 (Hero Amber) */}
                    <path
                      d={toPath(devEs05Points)}
                      fill="none"
                      stroke="#F2A541"
                      strokeWidth={isTVMode ? "5" : "3.5"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: 1400,
                        strokeDashoffset: 1400 * (1 - gridProgress)
                      }}
                      className="filter drop-shadow-[0_0_8px_rgba(242,165,65,0.85)]"
                    />

                    {/* Steady Head Beacon */}
                    <g transform={`translate(${gridHeadEts05.x}, ${gridHeadEts05.y})`}>
                      <circle r={isTVMode ? "7" : "5"} fill="#F2A541" opacity="0.4" />
                      <circle r={isTVMode ? "5" : "3.5"} fill="#F2A541" />
                      <circle r="1.5" fill="#FFFFFF" />
                    </g>
                  </svg>
                </div>
              </div>

              {/* BOTTOM RIGHT: SLR */}
              <div
                className="relative flex flex-col rounded-2xl bg-slate-950/85 border border-slate-800/80 p-2.5 sm:p-4 shadow-xl backdrop-blur-md overflow-hidden"
              >
                <div className="flex items-center justify-between mb-1 px-1 z-10">
                  <h3 className={`font-light tracking-wider text-slate-100 ${isTVMode ? 'text-2xl sm:text-3xl 2xl:text-4xl' : 'text-lg sm:text-2xl'}`}>SLR</h3>
                  <span className={`font-mono text-rose-400 ${isTVMode ? 'text-sm sm:text-base 2xl:text-lg font-bold' : 'text-xs'}`}>MAE: 52,654</span>
                </div>
                <div className="flex-1 relative w-full h-full min-h-0">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="slrAreaGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
                      </linearGradient>
                      <filter id="slrGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <clipPath id="slrGridClip">
                        <rect x={0} y={0} width={gridHeadSlr.x} height={svgHeight} />
                      </clipPath>
                    </defs>

                    {/* Y Ticks & Gridlines (Aligned to Y-Axis) */}
                    {[250000, 350000, 450000].map(v => (
                      <g key={v}>
                        <line x1={padLeft} y1={getY(v)} x2={padLeft + plotW} y2={getY(v)} stroke="#334155" strokeDasharray="4 4" strokeOpacity="0.6" />
                        <text x={padLeft - 8} y={getY(v) + 4} textAnchor="end" fill="#94A3B8" fontSize={isTVMode ? "17" : "14"} fontFamily="monospace" fontWeight="500">
                          {v / 1000}k
                        </text>
                      </g>
                    ))}

                    {/* Y-Axis Line & X-Axis Baseline */}
                    <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke="#475569" strokeWidth={isTVMode ? "2.5" : "1.8"} />
                    <line x1={padLeft} y1={padTop + plotH} x2={padLeft + plotW} y2={padTop + plotH} stroke="#475569" strokeWidth={isTVMode ? "2.5" : "1.8"} />
                    <text x={padLeft - 8} y={padTop - 8} textAnchor="end" fill="#94A3B8" fontSize={isTVMode ? "15" : "12"} fontFamily="monospace">
                      TEUs
                    </text>

                    {/* Mini Legend */}
                    <g transform={`translate(${padLeft + plotW - 130}, ${padTop - 8})`}>
                      <line x1="0" y1="0" x2="16" y2="0" stroke="#94A3B8" strokeWidth={isTVMode ? "3" : "2"} strokeDasharray="3 2" />
                      <text x="22" y="3" fill="#94A3B8" fontSize={isTVMode ? "15" : "12"} fontFamily="monospace">Actual</text>
                      <line x1="68" y1="0" x2="84" y2="0" stroke="#F43F5E" strokeWidth={isTVMode ? "4" : "2.8"} />
                      <text x="90" y="3" fill="#F43F5E" fontSize={isTVMode ? "15" : "12"} fontFamily="monospace">SLR</text>
                    </g>

                    {/* X Ticks (Periods 1-30) */}
                    {devTicks.map(t => (
                      <text key={t.period} x={getDevX(t.period)} y={padTop + plotH + 22} textAnchor="middle" fill="#94A3B8" fontSize={isTVMode ? "16" : "13"} fontFamily="monospace">
                        {t.label}
                      </text>
                    ))}

                    {/* Actual Series Reference Aligned to Y-Axis (Periods 1-30) */}
                    <path d={devActualPath} fill="none" stroke="#94A3B8" strokeWidth={isTVMode ? "3" : "2"} strokeDasharray="4 3" strokeOpacity="0.85" />

                    {/* Shaded Area */}
                    <path
                      d={`${toPath(devSlrPoints)} L ${devSlrPoints[devSlrPoints.length - 1].x} ${padTop + plotH} L ${devSlrPoints[0].x} ${padTop + plotH} Z`}
                      fill="url(#slrAreaGrad2)"
                      clipPath="url(#slrGridClip)"
                    />

                    {/* Glowing Aura Line */}
                    <path
                      d={toPath(devSlrPoints)}
                      fill="none"
                      stroke="#E11D48"
                      strokeWidth={isTVMode ? "10" : "7"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.3"
                      filter="url(#slrGlow)"
                      style={{
                        strokeDasharray: 1400,
                        strokeDashoffset: 1400 * (1 - gridProgress)
                      }}
                    />

                    {/* Sharp Crisp Foreground Line */}
                    <path
                      d={toPath(devSlrPoints)}
                      fill="none"
                      stroke="#F43F5E"
                      strokeWidth={isTVMode ? "5" : "3.5"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: 1400,
                        strokeDashoffset: 1400 * (1 - gridProgress)
                      }}
                      className="filter drop-shadow-[0_0_8px_rgba(244,63,94,0.85)]"
                    />

                    {/* Steady Head Beacon */}
                    <g transform={`translate(${gridHeadSlr.x}, ${gridHeadSlr.y})`}>
                      <circle r={isTVMode ? "7" : "5"} fill="#F43F5E" opacity="0.4" />
                      <circle r={isTVMode ? "5" : "3.5"} fill="#F43F5E" />
                      <circle r="1.5" fill="#FFFFFF" />
                    </g>
                  </svg>
                </div>
              </div>

              </div>
            )}

            {/* ROCK-STEADY CENTER STAGE SPOTLIGHT CARD */}
            <AnimatePresence mode="wait">
              {activeSoloModel && (
                <div className="absolute inset-0 z-30 flex items-center justify-center p-2 sm:p-4 md:p-6 pointer-events-none">
                  <motion.div
                    key={activeSoloModel}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1.0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className={`relative w-full ${
                      isTVMode
                        ? 'max-w-[95vw] 2xl:max-w-[96vw] h-[82vh] 2xl:h-[86vh] max-h-[920px]'
                        : 'max-w-5xl sm:max-w-6xl h-[72vh] sm:h-[75vh] max-h-[660px]'
                    } bg-slate-950/95 border border-slate-700/80 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.95)] p-3 sm:p-5 2xl:p-8 backdrop-blur-2xl flex flex-col pointer-events-auto`}
                  >
                    {/* Model Top Bar: Overlapped Comparison */}
                    <div className="flex items-center justify-between mb-2 px-1 z-10">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <h3 className="text-base sm:text-xl 2xl:text-3xl font-light tracking-wider text-slate-100">
                          ALL 4 CONVENTIONAL MODELS OVERLAPPED
                        </h3>
                        <span className="text-[10px] sm:text-xs 2xl:text-sm font-mono text-amber-300 bg-amber-500/10 border border-amber-400/30 px-2 sm:px-3 py-0.5 rounded-full">
                          Development Stage (Periods 1–30)
                        </span>
                      </div>

                      <button
                        onClick={() => setManualSolo('grid')}
                        className="text-slate-400 hover:text-slate-100 text-[10px] sm:text-xs 2xl:text-sm font-mono uppercase tracking-widest px-2.5 sm:px-3.5 py-1 rounded-full bg-slate-800/60 border border-slate-700 hover:border-slate-500 transition-colors"
                      >
                        4 in One Frame (Grid)
                      </button>
                    </div>

                    {/* Dedicated Steady SVG Plot (Periods 1-30) */}
                    <div className="flex-1 relative w-full h-full min-h-0">
                      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                        <defs>
                          <clipPath id="soloSmaClip">
                            <rect x={0} y={0} width={soloHeadSma.x} height={svgHeight} />
                          </clipPath>
                          <clipPath id="soloWmaClip">
                            <rect x={0} y={0} width={soloHeadWma.x} height={svgHeight} />
                          </clipPath>
                          <clipPath id="soloEtsClip">
                            <rect x={0} y={0} width={soloHeadEts05.x} height={svgHeight} />
                          </clipPath>
                          <clipPath id="soloSlrClip">
                            <rect x={0} y={0} width={soloHeadSlr.x} height={svgHeight} />
                          </clipPath>
                        </defs>

                        {/* Steady Background Gridlines & Y-Axis */}
                        {[250000, 300000, 350000, 400000, 450000].map(v => (
                          <g key={v}>
                            <line
                              x1={padLeft}
                              y1={getY(v)}
                              x2={padLeft + plotW}
                              y2={getY(v)}
                              stroke="#334155"
                              strokeDasharray="4 4"
                              strokeOpacity="0.6"
                            />
                            <text
                              x={padLeft - 8}
                              y={getY(v) + 3}
                              textAnchor="end"
                              fill="#94A3B8"
                              fontSize={isTVMode ? "15" : "10"}
                              fontFamily="monospace"
                              fontWeight="600"
                            >
                              {(v / 1000).toFixed(0)}k
                            </text>
                          </g>
                        ))}

                        {/* Y-Axis Line & X-Axis Baseline */}
                        <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke="#475569" strokeWidth={isTVMode ? "2.5" : "1.5"} />
                        <line x1={padLeft} y1={padTop + plotH} x2={padLeft + plotW} y2={padTop + plotH} stroke="#475569" strokeWidth={isTVMode ? "2.5" : "1.5"} />
                        <text x={padLeft - 8} y={padTop - 8} textAnchor="end" fill="#94A3B8" fontSize={isTVMode ? "14" : "9"} fontFamily="monospace" fontWeight="bold">
                          TEUs
                        </text>

                        {/* X Axis Labels (Periods 1-30 Only) */}
                        {devTicks.map(t => (
                          <text
                            key={t.period}
                            x={getDevX(t.period)}
                            y={padTop + plotH + (isTVMode ? 26 : 22)}
                            textAnchor="middle"
                            fill="#CBD5E1"
                            fontSize={isTVMode ? "15" : "11"}
                            fontFamily="monospace"
                            fontWeight="500"
                          >
                            {t.label}
                          </text>
                        ))}

                        {/* Actual Series Reference Aligned to Y-Axis (Periods 1-30) */}
                        <path d={devActualPath} fill="none" stroke="#94A3B8" strokeWidth={isTVMode ? "3.5" : "2"} strokeDasharray="4 3" strokeOpacity="0.85" />

                        {/* OVERLAP ALL CONVENTIONAL MODELS VIEW */}
                        {activeSoloModel === 'overlap' && (
                          <>
                            {/* 1. SMA Curve (Sky Blue) */}
                            <path
                              d={toPath(devSmaPoints)}
                              fill="none"
                              stroke="#38BDF8"
                              strokeWidth={isTVMode ? "4.5" : "2.5"}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{
                                strokeDasharray: 1600,
                                strokeDashoffset: 1600 * (1 - overlapProg)
                              }}
                              className="filter drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]"
                            />
                            <g transform={`translate(${overlapHeadSma.x}, ${overlapHeadSma.y})`}>
                              <circle r={isTVMode ? "8" : "5"} fill="#38BDF8" opacity="0.4" />
                              <circle r={isTVMode ? "5" : "3.5"} fill="#38BDF8" />
                              <circle r="1.5" fill="#FFFFFF" />
                            </g>

                            {/* 2. WMA Curve (Emerald) */}
                            <path
                              d={toPath(devWmaPoints)}
                              fill="none"
                              stroke="#34D399"
                              strokeWidth={isTVMode ? "4.5" : "2.5"}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{
                                strokeDasharray: 1600,
                                strokeDashoffset: 1600 * (1 - overlapProg)
                              }}
                              className="filter drop-shadow-[0_0_6px_rgba(52,211,153,0.7)]"
                            />
                            <g transform={`translate(${overlapHeadWma.x}, ${overlapHeadWma.y})`}>
                              <circle r={isTVMode ? "8" : "5"} fill="#34D399" opacity="0.4" />
                              <circle r={isTVMode ? "5" : "3.5"} fill="#34D399" />
                              <circle r="1.5" fill="#FFFFFF" />
                            </g>

                            {/* 3. ETS α=0.20 (Thin Light Blue) */}
                            <path
                              d={toPath(devEs02Points)}
                              fill="none"
                              stroke="#7DD3FC"
                              strokeWidth={isTVMode ? "2.8" : "1.6"}
                              strokeDasharray="4 3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeOpacity="0.75"
                              style={{
                                strokeDasharray: 1600,
                                strokeDashoffset: 1600 * (1 - overlapProg)
                              }}
                            />

                            {/* 4. ETS α=0.80 (Thin Orange) */}
                            <path
                              d={toPath(devEs08Points)}
                              fill="none"
                              stroke="#FB923C"
                              strokeWidth={isTVMode ? "2.8" : "1.6"}
                              strokeDasharray="4 3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeOpacity="0.75"
                              style={{
                                strokeDasharray: 1600,
                                strokeDashoffset: 1600 * (1 - overlapProg)
                              }}
                            />

                            {/* 5. SLR Linear Trend (Rose) */}
                            <path
                              d={toPath(devSlrPoints)}
                              fill="none"
                              stroke="#F43F5E"
                              strokeWidth={isTVMode ? "4.5" : "2.5"}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{
                                strokeDasharray: 1600,
                                strokeDashoffset: 1600 * (1 - overlapProg)
                              }}
                              className="filter drop-shadow-[0_0_6px_rgba(244,63,94,0.7)]"
                            />
                            <g transform={`translate(${overlapHeadSlr.x}, ${overlapHeadSlr.y})`}>
                              <circle r={isTVMode ? "8" : "5"} fill="#F43F5E" opacity="0.4" />
                              <circle r={isTVMode ? "5" : "3.5"} fill="#F43F5E" />
                              <circle r="1.5" fill="#FFFFFF" />
                            </g>

                            {/* 6. ETS α=0.50 (Hero Amber Baseline - Bold on top) */}
                            <path
                              d={toPath(devEs05Points)}
                              fill="none"
                              stroke="#D97706"
                              strokeWidth={isTVMode ? "14" : "9"}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              opacity="0.3"
                              filter="url(#etsGlow)"
                              style={{
                                strokeDasharray: 1600,
                                strokeDashoffset: 1600 * (1 - overlapProg)
                              }}
                            />
                            <path
                              d={toPath(devEs05Points)}
                              fill="none"
                              stroke="#F2A541"
                              strokeWidth={isTVMode ? "6" : "4"}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{
                                strokeDasharray: 1600,
                                strokeDashoffset: 1600 * (1 - overlapProg)
                              }}
                              className="filter drop-shadow-[0_0_12px_rgba(242,165,65,0.95)]"
                            />
                            <g transform={`translate(${overlapHeadEts05.x}, ${overlapHeadEts05.y})`}>
                              <circle r={isTVMode ? "11" : "8"} fill="#F2A541" opacity="0.3" />
                              <circle r={isTVMode ? "7" : "5.5"} fill="#F2A541" />
                              <circle r={isTVMode ? "3" : "2"} fill="#FFFFFF" />
                            </g>
                          </>
                        )}
                      </svg>
                    </div>

                    {/* Bottom Legend Badges for Overlap View */}
                    {activeSoloModel === 'overlap' && (
                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm 2xl:text-base font-mono">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 2xl:gap-5">
                          <span className="inline-flex items-center gap-1.5 text-slate-300">
                            <span className="w-3.5 h-0.5 border-b border-dashed border-slate-300" />
                            Actual
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-sky-400">
                            <span className="w-3.5 h-1 rounded bg-sky-400" />
                            SMA (33,428)
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-emerald-400">
                            <span className="w-3.5 h-1 rounded bg-emerald-400" />
                            WMA (32,142)
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-rose-400">
                            <span className="w-3.5 h-1 rounded bg-rose-400" />
                            SLR (52,654)
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-amber-300 font-bold bg-amber-500/15 border border-amber-400/30 px-2.5 py-0.5 rounded-lg">
                            <span className="w-3.5 h-1.5 bg-[#F2A541] rounded-full" />
                            ETS α0.50 (30,596 · Lowest Dev MAE)
                          </span>
                        </div>
                        <span className="text-[11px] sm:text-xs 2xl:text-sm text-slate-400 italic">
                          Lower MAE = Better Fit
                        </span>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </div>
        )}

        {/* ============================================================== */}
        {/* BEAT 3 (1:26 - 1:41 · 16s): PRE-VALIDATION BASELINE SELECTION   */}
        {/* ============================================================== */}
        {currentBeatIndex === 3 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 z-10 bg-[#060B14]">
            <motion.div
              key={beatElapsedSeconds < 4.5 ? "thebaseline" : "etsbaseline"}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1.0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-center flex flex-col items-center gap-4"
            >
              {beatElapsedSeconds < 4.5 ? (
                <h1 className="text-5xl md:text-8xl 2xl:text-9xl font-extralight text-slate-100 tracking-[0.2em] uppercase">
                  THE BASELINE
                </h1>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <span className="text-xs sm:text-sm 2xl:text-base font-mono uppercase tracking-[0.3em] text-slate-400 block mb-1">
                    Pre-Validation Locked Baseline · Development Periods 1–30
                  </span>
                  <h1 className="text-5xl md:text-8xl 2xl:text-9xl font-extralight text-slate-100 tracking-tight">
                    ETS <span className="text-[#F2A541] font-normal">α = 0.50</span>
                  </h1>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 2xl:px-6 2xl:py-2.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs sm:text-sm 2xl:text-lg font-mono font-bold mt-2">
                    <span>Locked at 30,596 TEUs MAE</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300">Periods 31–36 Blind Holdout</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* ============================================================== */}
        {/* BEAT 4 (1:42 - 2:22 · 41s): ACTUAL VS STATISTICAL & ML FORECAST */}
        {/* + LAST PART: WHICH ONE WINS?                                    */}
        {/* ============================================================== */}
        {currentBeatIndex === 4 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 z-10 overflow-hidden bg-[#060B14]">
            {/* Expansive Standalone High-Resolution Graph (Full Beat 4 Timeframe) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1.0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className={`w-full ${
                isTVMode
                  ? 'max-w-[96vw] 2xl:max-w-[97vw] h-[83vh] 2xl:h-[87vh] max-h-[940px]'
                  : 'max-w-6xl h-[78vh]'
              } flex flex-col items-center justify-center px-1 sm:px-4`}
            >
              {/* Minimal Clean Header with Progressive Stages */}
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 mb-2 px-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <h2 className="text-base sm:text-xl md:text-2xl 2xl:text-3xl font-light tracking-wide text-white">
                    Actual vs. Statistical &amp; Machine Learning Forecasts
                  </h2>
                  <span className="text-[10px] sm:text-xs 2xl:text-sm font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300">
                    {statModelFilter === 'arima' && 'Stage 1/4 · ARIMA (1,1,0) Candidate Run'}
                    {statModelFilter === 'lr' && 'Stage 2/4 · Lagged Linear Regression Run'}
                    {statModelFilter === 'rf' && 'Stage 3/4 · Random Forest Regressor Run'}
                    {statModelFilter === 'all' && 'Stage 4/4 · All Four Overlapped & Merged'}
                  </span>
                </div>

                {/* Clean Filter Toggles following progressive order */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <button
                    type="button"
                    onClick={() => setManualStatFilter('arima')}
                    className={`px-2.5 sm:px-3.5 py-1 2xl:py-1.5 rounded-lg text-[10px] sm:text-xs 2xl:text-sm font-mono transition-all ${
                      statModelFilter === 'arima'
                        ? 'bg-orange-500/20 text-[#ff7f0e] border border-orange-500/50 shadow font-bold'
                        : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    1. ARIMA (1,1,0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualStatFilter('lr')}
                    className={`px-2.5 sm:px-3.5 py-1 2xl:py-1.5 rounded-lg text-[10px] sm:text-xs 2xl:text-sm font-mono transition-all ${
                      statModelFilter === 'lr'
                        ? 'bg-emerald-500/20 text-[#34D399] border border-emerald-500/50 shadow font-bold'
                        : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    2. Lagged LR
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualStatFilter('rf')}
                    className={`px-2.5 sm:px-3.5 py-1 2xl:py-1.5 rounded-lg text-[10px] sm:text-xs 2xl:text-sm font-mono transition-all ${
                      statModelFilter === 'rf'
                        ? 'bg-red-500/20 text-[#d62728] border border-red-500/50 shadow font-bold'
                        : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    3. Random Forest
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualStatFilter('all')}
                    className={`px-2.5 sm:px-3.5 py-1 2xl:py-1.5 rounded-lg text-[10px] sm:text-xs 2xl:text-sm font-mono transition-all ${
                      statModelFilter === 'all'
                        ? 'bg-amber-500/20 text-[#F2A541] border border-amber-500/50 shadow font-bold'
                        : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    4. All 4 Overlapped
                  </button>
                </div>
              </div>

                {/* Expansive Standalone High-Res SVG Graph Container */}
                <div className="relative w-full flex-1 rounded-2xl bg-slate-950/95 border border-slate-800 p-2 sm:p-4 2xl:p-6 shadow-2xl backdrop-blur-xl flex flex-col min-h-0 overflow-hidden">
                  <svg viewBox={`0 0 ${holdoutSvgW} ${holdoutSvgH}`} className="w-full flex-1 overflow-visible">
                    <defs>
                      <filter id="arimaHoldoutGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <filter id="lrHoldoutGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <filter id="rfHoldoutGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Left Y-Axis Label */}
                    <text
                      x={-(holdoutPadT + holdoutPlotH / 2)}
                      y="20"
                      transform="rotate(-90)"
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize={isTVMode ? "16" : "12"}
                      fontFamily="sans-serif"
                    >
                      Export Volume (TEUs)
                    </text>

                    {/* Bottom X-Axis Label */}
                    <text
                      x={holdoutPadL + holdoutPlotW / 2}
                      y={holdoutSvgH - 10}
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize={isTVMode ? "16" : "12"}
                      fontFamily="sans-serif"
                    >
                      Validation Horizon (July 2024 – December 2024)
                    </text>

                    {/* Outer Plot Box Border */}
                    <rect
                      x={holdoutPadL}
                      y={holdoutPadT}
                      width={holdoutPlotW}
                      height={holdoutPlotH}
                      fill="none"
                      stroke="#475569"
                      strokeWidth={isTVMode ? "2" : "1.2"}
                    />

                    {/* Horizontal Y Gridlines & Ticks (380000 to 460000) */}
                    {[380000, 400000, 420000, 440000, 460000].map(v => (
                      <g key={v}>
                        <line
                          x1={holdoutPadL}
                          y1={getHoldoutY(v)}
                          x2={holdoutPadL + holdoutPlotW}
                          y2={getHoldoutY(v)}
                          stroke="#334155"
                          strokeWidth={isTVMode ? "1.2" : "0.8"}
                          strokeDasharray="4 4"
                        />
                        <text
                          x={holdoutPadL - 8}
                          y={getHoldoutY(v) + 4}
                          textAnchor="end"
                          fill="#CBD5E1"
                          fontSize={isTVMode ? "15" : "11"}
                          fontFamily="monospace"
                          fontWeight="600"
                        >
                          {v.toLocaleString()}
                        </text>
                      </g>
                    ))}

                    {/* Vertical X Gridlines & Month Ticks (2024-07 to 2024-12) */}
                    {holdoutActualPoints.map((pt, i) => (
                      <g key={`v-grid-${i}`}>
                        <line
                          x1={pt.x}
                          y1={holdoutPadT}
                          x2={pt.x}
                          y2={holdoutPadT + holdoutPlotH}
                          stroke="#334155"
                          strokeWidth={isTVMode ? "1.2" : "0.8"}
                          strokeDasharray="4 4"
                        />
                        <text
                          x={pt.x}
                          y={holdoutPadT + holdoutPlotH + (isTVMode ? 24 : 20)}
                          textAnchor="middle"
                          fill="#E2E8F0"
                          fontSize={isTVMode ? "16" : "12"}
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {pt.month}
                        </text>
                      </g>
                    ))}

                    {/* 1. Actual Validation Curve in Blue (#1f77b4) */}
                    <path
                      d={holdoutActualPath}
                      fill="none"
                      stroke="#1f77b4"
                      strokeWidth={isTVMode ? "6" : "4"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: 1000,
                        strokeDashoffset: 1000 * (1 - statVsMlProg)
                      }}
                      className="filter drop-shadow-[0_0_8px_rgba(31,119,180,0.85)]"
                      opacity={statModelFilter === 'all' ? 1.0 : 0.65}
                    />
                    {holdoutActualPoints.map((pt, i) => {
                      const isRevealed = statVsMlProg >= (i / 5) * 0.9;
                      return (
                        <circle
                          key={`pt-act-${i}`}
                          cx={pt.x}
                          cy={pt.y}
                          r={isTVMode ? "7" : "5"}
                          fill="#1f77b4"
                          stroke="#FFFFFF"
                          strokeWidth={isTVMode ? "2" : "1.5"}
                          opacity={isRevealed ? (statModelFilter === 'all' ? 1.0 : 0.7) : 0}
                          className="transition-opacity duration-300"
                        />
                      );
                    })}
                    {statVsMlProg > 0 && statModelFilter === 'all' && (
                      <g transform={`translate(${statHeadActual.x}, ${statHeadActual.y})`}>
                        <circle r={isTVMode ? "11" : "8"} fill="#1f77b4" opacity="0.35" />
                        <circle r={isTVMode ? "7" : "5"} fill="#1f77b4" />
                        <circle r={isTVMode ? "3" : "2.5"} fill="#FFFFFF" />
                      </g>
                    )}

                    {/* 2. ARIMA (1,1,0) Curve in Orange (#ff7f0e) */}
                    <path
                      d={holdoutArimaPath}
                      fill="none"
                      stroke="#ea580c"
                      strokeWidth={isTVMode ? "15" : "9"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={statModelFilter === 'all' || statModelFilter === 'arima' ? 0.35 : 0}
                      filter="url(#arimaHoldoutGlow)"
                      style={{
                        strokeDasharray: 1000,
                        strokeDashoffset: 1000 * (1 - statVsMlProg)
                      }}
                    />
                    <path
                      d={holdoutArimaPath}
                      fill="none"
                      stroke="#ff7f0e"
                      strokeWidth={isTVMode ? "8" : (statModelFilter === 'arima' ? '5.5' : '4.5')}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: 1000,
                        strokeDashoffset: 1000 * (1 - statVsMlProg)
                      }}
                      className="filter drop-shadow-[0_0_12px_rgba(255,127,14,0.95)]"
                      opacity={statModelFilter === 'all' || statModelFilter === 'arima' ? 1.0 : 0}
                    />
                    {holdoutArimaPoints.map((pt, i) => {
                      const isRevealed = statVsMlProg >= (i / 5) * 0.9;
                      return (
                        <circle
                          key={`pt-ar-${i}`}
                          cx={pt.x}
                          cy={pt.y}
                          r={isTVMode ? "7.5" : "5"}
                          fill="#ff7f0e"
                          stroke="#FFFFFF"
                          strokeWidth={isTVMode ? "2" : "1.5"}
                          opacity={isRevealed && (statModelFilter === 'all' || statModelFilter === 'arima') ? 1 : 0}
                          className="transition-opacity duration-300"
                        />
                      );
                    })}
                    {statVsMlProg > 0 && (statModelFilter === 'all' || statModelFilter === 'arima') && (
                      <g transform={`translate(${statHeadArima.x}, ${statHeadArima.y})`}>
                        <circle r={isTVMode ? "12" : "9"} fill="#ff7f0e" opacity="0.4" />
                        <circle r={isTVMode ? "7.5" : "5.5"} fill="#ff7f0e" />
                        <circle r={isTVMode ? "3" : "2.5"} fill="#FFFFFF" />
                      </g>
                    )}

                    {/* 3. Lagged Linear Regression Curve in Green (#34D399) */}
                    <path
                      d={holdoutLrPath}
                      fill="none"
                      stroke="#059669"
                      strokeWidth={isTVMode ? "12" : "7"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={statModelFilter === 'all' || statModelFilter === 'lr' ? 0.35 : 0}
                      filter="url(#lrHoldoutGlow)"
                      style={{
                        strokeDasharray: 1000,
                        strokeDashoffset: 1000 * (1 - statVsMlProg)
                      }}
                    />
                    <path
                      d={holdoutLrPath}
                      fill="none"
                      stroke="#34D399"
                      strokeWidth={isTVMode ? "7" : (statModelFilter === 'lr' ? '5' : '4')}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: 1000,
                        strokeDashoffset: 1000 * (1 - statVsMlProg)
                      }}
                      className="filter drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                      opacity={statModelFilter === 'all' || statModelFilter === 'lr' ? 1.0 : 0}
                    />
                    {holdoutLrPoints.map((pt, i) => {
                      const isRevealed = statVsMlProg >= (i / 5) * 0.9;
                      return (
                        <circle
                          key={`pt-lr-${i}`}
                          cx={pt.x}
                          cy={pt.y}
                          r={isTVMode ? "7" : "5"}
                          fill="#34D399"
                          stroke="#FFFFFF"
                          strokeWidth={isTVMode ? "2" : "1.5"}
                          opacity={isRevealed && (statModelFilter === 'all' || statModelFilter === 'lr') ? 1 : 0}
                          className="transition-opacity duration-300"
                        />
                      );
                    })}
                    {statVsMlProg > 0 && (statModelFilter === 'all' || statModelFilter === 'lr') && (
                      <g transform={`translate(${statHeadLr.x}, ${statHeadLr.y})`}>
                        <circle r={isTVMode ? "11" : "8"} fill="#34D399" opacity="0.35" />
                        <circle r={isTVMode ? "7" : "5"} fill="#34D399" />
                        <circle r={isTVMode ? "3" : "2.5"} fill="#FFFFFF" />
                      </g>
                    )}

                    {/* 4. Random Forest Curve in Red (#d62728) */}
                    <path
                      d={holdoutRfPath}
                      fill="none"
                      stroke="#991b1b"
                      strokeWidth={isTVMode ? "12" : "7"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={statModelFilter === 'all' || statModelFilter === 'rf' ? 0.35 : 0}
                      filter="url(#rfHoldoutGlow)"
                      style={{
                        strokeDasharray: 1000,
                        strokeDashoffset: 1000 * (1 - statVsMlProg)
                      }}
                    />
                    <path
                      d={holdoutRfPath}
                      fill="none"
                      stroke="#d62728"
                      strokeWidth={isTVMode ? "7" : (statModelFilter === 'rf' ? '5' : '4')}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: 1000,
                        strokeDashoffset: 1000 * (1 - statVsMlProg)
                      }}
                      className="filter drop-shadow-[0_0_8px_rgba(214,39,40,0.9)]"
                      opacity={statModelFilter === 'all' || statModelFilter === 'rf' ? 1.0 : 0}
                    />
                    {holdoutRfPoints.map((pt, i) => {
                      const isRevealed = statVsMlProg >= (i / 5) * 0.9;
                      return (
                        <circle
                          key={`pt-rf-${i}`}
                          cx={pt.x}
                          cy={pt.y}
                          r={isTVMode ? "7" : "5"}
                          fill="#d62728"
                          stroke="#FFFFFF"
                          strokeWidth={isTVMode ? "2" : "1.5"}
                          opacity={isRevealed && (statModelFilter === 'all' || statModelFilter === 'rf') ? 1 : 0}
                          className="transition-opacity duration-300"
                        />
                      );
                    })}
                    {statVsMlProg > 0 && (statModelFilter === 'all' || statModelFilter === 'rf') && (
                      <g transform={`translate(${statHeadRf.x}, ${statHeadRf.y})`}>
                        <circle r={isTVMode ? "11" : "8"} fill="#d62728" opacity="0.35" />
                        <circle r={isTVMode ? "7" : "5"} fill="#d62728" />
                        <circle r={isTVMode ? "3" : "2.5"} fill="#FFFFFF" />
                      </g>
                    )}

                    {/* Integrated Legend Box */}
                    <g transform={`translate(${holdoutPadL + holdoutPlotW - (isTVMode ? 260 : 220)}, ${holdoutPadT + 16})`}>
                      <rect
                        x="0"
                        y="0"
                        width={isTVMode ? "250" : "210"}
                        height={isTVMode ? "120" : "105"}
                        rx="10"
                        fill="#060B14"
                        fillOpacity="0.94"
                        stroke="#334155"
                        strokeWidth="1.2"
                      />
                      <circle cx="16" cy={isTVMode ? 20 : 18} r={isTVMode ? "5.5" : "4.5"} fill="#1f77b4" />
                      <line x1="8" y1={isTVMode ? 20 : 18} x2="24" y2={isTVMode ? 20 : 18} stroke="#1f77b4" strokeWidth={isTVMode ? "3.5" : "2.5"} />
                      <text x="32" y={isTVMode ? 25 : 22} fill="#E2E8F0" fontSize={isTVMode ? "14" : "12"} fontFamily="sans-serif">
                        Actual Series
                      </text>

                      <circle cx="16" cy={isTVMode ? 48 : 42} r={isTVMode ? "6" : "5"} fill="#ff7f0e" />
                      <line x1="8" y1={isTVMode ? 48 : 42} x2="24" y2={isTVMode ? 48 : 42} stroke="#ff7f0e" strokeWidth={isTVMode ? "4" : "3"} />
                      <text x="32" y={isTVMode ? 53 : 46} fill="#F2A541" fontSize={isTVMode ? "14" : "12"} fontFamily="sans-serif" fontWeight="bold">
                        ARIMA (1,1,0)
                      </text>

                      <circle cx="16" cy={isTVMode ? 76 : 66} r={isTVMode ? "5.5" : "4.5"} fill="#34D399" />
                      <line x1="8" y1={isTVMode ? 76 : 66} x2="24" y2={isTVMode ? 76 : 66} stroke="#34D399" strokeWidth={isTVMode ? "3.5" : "2.5"} />
                      <text x="32" y={isTVMode ? 81 : 70} fill="#CBD5E1" fontSize={isTVMode ? "13" : "11"} fontFamily="sans-serif">
                        Lagged Linear Reg
                      </text>

                      <circle cx="16" cy={isTVMode ? 104 : 90} r={isTVMode ? "5.5" : "4.5"} fill="#d62728" />
                      <line x1="8" y1={isTVMode ? 104 : 90} x2="24" y2={isTVMode ? 104 : 90} stroke="#d62728" strokeWidth={isTVMode ? "3.5" : "2.5"} />
                      <text x="32" y={isTVMode ? 109 : 94} fill="#CBD5E1" fontSize={isTVMode ? "13" : "11"} fontFamily="sans-serif">
                        Random Forest
                      </text>
                    </g>
                  </svg>

                  {/* Clean Bottom Legend Strip */}
                  <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 2xl:gap-10 text-xs sm:text-sm 2xl:text-base font-mono pt-2 border-t border-slate-900 text-slate-300">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 2xl:w-4 2xl:h-4 rounded-full bg-[#1f77b4]" />
                      <span className="font-semibold text-white">Actual (426k – 460k TEUs)</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 2xl:w-4 2xl:h-4 rounded-full bg-[#ff7f0e]" />
                      <span className="font-bold text-[#ff7f0e]">ARIMA (1,1,0): 20,919 MAE · 4.71% MAPE</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 2xl:w-4 2xl:h-4 rounded-full bg-[#34D399]" />
                      <span className="text-[#86EFAC]">Lagged Linear Reg: 37,990 MAE</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 2xl:w-4 2xl:h-4 rounded-full bg-[#d62728]" />
                      <span className="text-[#FCA5A5]">Random Forest: 37,138 MAE</span>
                    </span>
                  </div>
                </div>
              </motion.div>
          </div>
        )}

        {/* ============================================================== */}
        {/* BEAT 5 (2:23 - 2:30 · 8s): VALIDATION RANKING ACROSS ALL MODELS  */}
        {/* & ARIMA (1,1,0) DECISIVE PERFORMANCE (NO DUPLICATE ARIMA WINS)  */}
        {/* ============================================================== */}
        {currentBeatIndex === 5 && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 2xl:p-8 z-10 ${isPhoneScreen ? 'overflow-y-auto phone-scrollable pb-24 pt-16' : 'overflow-hidden'} bg-[#060B14]`}>
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1.0 }}
              transition={{ duration: 0.6 }}
              className={`w-full ${isTVMode ? 'max-w-[95vw] 2xl:max-w-[96vw]' : 'max-w-6xl'} flex flex-col lg:flex-row gap-4 2xl:gap-8 items-stretch justify-center relative mx-auto px-2 sm:px-4`}
            >
              {/* LEFT: Larger Validation Ranking Across All Models */}
              <div className="flex-1 flex flex-col gap-3 rounded-2xl bg-slate-950/90 border border-slate-800 p-4 sm:p-6 2xl:p-8 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Award className="w-6 h-6 2xl:w-8 2xl:h-8 text-amber-400" />
                    <div>
                      <h2 className="text-xl sm:text-2xl 2xl:text-3xl font-light text-white tracking-wide">
                        Validation Ranking Across All Models
                      </h2>
                      <p className="text-xs sm:text-sm 2xl:text-base font-mono text-slate-400">
                        Out-of-Sample MAE · Holdout Periods 31–36
                      </p>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm 2xl:text-base font-mono font-bold text-[#F2A541] px-3 py-1 2xl:px-4 2xl:py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                    ★ #1 ARIMA
                  </div>
                </div>

                <div className="space-y-2 2xl:space-y-3 mt-1">
                  {validationRanking.slice(0, 8).map((item, idx) => {
                    const isArima = item.rank === 1;
                    const isBaseline = item.name.includes('ETS') && item.name.includes('0.50');
                    const maxMAE = 46000;
                    const barWidth = Math.min(100, (item.mae / maxMAE) * 100);
                    return (
                      <div key={item.name} className="flex items-center gap-2.5 text-xs sm:text-sm 2xl:text-base font-mono">
                        <span className={`w-6 2xl:w-8 text-center font-bold ${isArima ? 'text-amber-400 text-sm 2xl:text-lg' : 'text-slate-500'}`}>
                          #{item.rank}
                        </span>
                        <span className={`w-36 sm:w-48 2xl:w-60 text-right truncate ${
                          isArima ? 'text-[#F2A541] font-bold text-sm sm:text-base 2xl:text-lg' : isBaseline ? 'text-sky-300 font-semibold' : 'text-slate-300'
                        }`}>
                          {item.name} {isBaseline && '(Baseline)'}
                        </span>
                        <div className="flex-1 h-5 sm:h-6 2xl:h-8 bg-slate-900/90 rounded-md border border-slate-800 relative overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidth}%` }}
                            transition={{ duration: 0.7, delay: idx * 0.05 }}
                            className={`h-full rounded-md ${
                              isArima
                                ? 'bg-gradient-to-r from-amber-600 via-[#F2A541] to-amber-300 shadow-[0_0_12px_rgba(242,165,65,0.6)]'
                                : isBaseline
                                ? 'bg-gradient-to-r from-sky-700 to-sky-400'
                                : 'bg-[#1B6CA8]/80'
                            }`}
                          />
                        </div>
                        <span className={`w-24 sm:w-28 2xl:w-36 text-right ${
                          isArima ? 'text-[#F2A541] font-bold text-sm 2xl:text-lg' : isBaseline ? 'text-sky-300' : 'text-slate-400'
                        }`}>
                          {item.mae.toLocaleString()} TEUs
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs sm:text-sm 2xl:text-base font-mono text-slate-400">
                  <span>Reference: Naïve Repeat-Last: 19,944 TEUs</span>
                  <span className="text-emerald-400 font-bold">−24.5% error vs ETS α=0.50</span>
                </div>
              </div>

              {/* RIGHT: ARIMA Decisive Performance Highlights */}
              <div className="w-full lg:w-[42%] flex flex-col gap-3 rounded-2xl bg-[#0B2545]/40 border border-amber-500/30 p-4 sm:p-6 2xl:p-8 backdrop-blur-xl shadow-2xl justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 2xl:px-4 2xl:py-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs 2xl:text-sm font-mono font-bold tracking-wider uppercase mb-2">
                    <span className="w-2 h-2 2xl:w-3 2xl:h-3 rounded-full bg-amber-400 animate-ping" />
                    <span>Decisive Performance</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl 2xl:text-4xl font-light text-white tracking-tight">
                    ARIMA (1,1,0) <span className="text-[#F2A541] font-normal">Victory</span>
                  </h3>
                  <p className="text-xs sm:text-sm 2xl:text-base font-mono text-slate-400 mt-0.5">
                    Lowest error across both development and validation
                  </p>
                </div>

                {/* 4 Large Highlight Metric Badges */}
                <div className="grid grid-cols-2 gap-3 2xl:gap-4 my-2">
                  <div className="p-3.5 2xl:p-5 rounded-xl bg-amber-950/60 border border-amber-400/60 flex flex-col">
                    <span className="text-[10px] sm:text-xs 2xl:text-sm font-mono text-slate-300 uppercase">MAE (#1 Rank)</span>
                    <span className="text-2xl sm:text-3xl 2xl:text-4xl font-bold font-mono text-white mt-1">20,919</span>
                    <span className="text-[10px] sm:text-xs 2xl:text-sm font-mono text-emerald-400 mt-1">−24.5% vs Baseline</span>
                  </div>
                  <div className="p-3.5 2xl:p-5 rounded-xl bg-amber-950/60 border border-amber-400/60 flex flex-col">
                    <span className="text-[10px] sm:text-xs 2xl:text-sm font-mono text-slate-300 uppercase">MAPE (&lt;5% Band)</span>
                    <span className="text-2xl sm:text-3xl 2xl:text-4xl font-bold font-mono text-[#F2A541] mt-1">4.71%</span>
                    <span className="text-[10px] sm:text-xs 2xl:text-sm font-mono text-emerald-400 mt-1">Decisive Precision</span>
                  </div>
                  <div className="p-3.5 2xl:p-5 rounded-xl bg-slate-950/80 border border-slate-700 flex flex-col">
                    <span className="text-[10px] sm:text-xs 2xl:text-sm font-mono text-slate-400 uppercase">RMSE</span>
                    <span className="text-xl sm:text-2xl 2xl:text-3xl font-bold font-mono text-white mt-1">24,426</span>
                    <span className="text-[10px] sm:text-xs 2xl:text-sm font-mono text-sky-400 mt-1">Dampened Variance</span>
                  </div>
                  <div className="p-3.5 2xl:p-5 rounded-xl bg-slate-950/80 border border-slate-700 flex flex-col">
                    <span className="text-[10px] sm:text-xs 2xl:text-sm font-mono text-slate-400 uppercase">Directional Drift</span>
                    <span className="text-xl sm:text-2xl 2xl:text-3xl font-bold font-mono text-white mt-1">+2.43%</span>
                    <span className="text-[10px] sm:text-xs 2xl:text-sm font-mono text-sky-400 mt-1">Minimal MPE Bias</span>
                  </div>
                </div>

                <div className="p-3 2xl:p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs sm:text-sm 2xl:text-base font-mono text-slate-300 flex items-center gap-2">
                  <Check className="w-4 h-4 2xl:w-5 2xl:h-5 text-emerald-400 flex-shrink-0" />
                  <span>Outperformed Random Forest (8.31%) &amp; Linear Trend (24.15%)</span>
                </div>
              </div>
            </motion.div>

            {/* Last Part of Beat 5: The Question That Drives Action */}
            <AnimatePresence>
              {beatElapsedSeconds >= 4.0 && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1.0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`w-full ${isTVMode ? 'max-w-[95vw] 2xl:max-w-[96vw]' : 'max-w-6xl'} mt-3 p-3.5 sm:p-5 2xl:p-6 rounded-2xl bg-slate-950/95 border-2 border-amber-500/80 shadow-[0_0_35px_rgba(242,165,65,0.4)] backdrop-blur-2xl flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left z-30`}
                >
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 2xl:px-3 2xl:py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] sm:text-xs 2xl:text-sm font-mono font-bold uppercase tracking-wider">
                      <span>THE CRITICAL QUESTION · CLIMAX</span>
                    </div>
                    <h3 className="text-lg sm:text-2xl md:text-3xl 2xl:text-4xl font-light text-white tracking-wide uppercase">
                      WHICH ONE WINS? <span className="text-[#F2A541] font-normal">→ ARIMA (1,1,0)!</span>
                    </h3>
                    <p className="text-xs sm:text-sm md:text-base 2xl:text-xl font-mono text-slate-200">
                      So, what should port management do with these findings?
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm 2xl:text-base font-mono font-semibold text-sky-400 px-3 py-1.5 2xl:px-4 2xl:py-2 rounded-xl bg-sky-950/60 border border-sky-400/40">
                    <span>NEXT → BEAT 6: OPERATIONS RECOMMENDATION</span>
                    <ArrowRight className="w-4 h-4 2xl:w-5 2xl:h-5 animate-pulse" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {/* ============================================================== */}
        {/* BEAT 6 (3:45 - 4:30 · 45s): RECOMMENDATION, OVERSIGHT & BOOKEND */}
        {/* ============================================================== */}
        {currentBeatIndex === 6 && (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            {/* Phase 6a (0s - 14s): MORPH 6 — Forecast line -> Operations Capacity (USE ARIMA, ROLL FORWARD) */}
            {beatElapsedSeconds < 14 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center z-10 flex flex-col items-center gap-4"
              >
                <div className="text-xs sm:text-sm 2xl:text-base font-mono uppercase tracking-[0.3em] text-[#F2A541]">
                  Operational Management Action
                </div>
                <h1 className="text-5xl md:text-8xl 2xl:text-9xl font-extralight text-white tracking-tight">
                  USE ARIMA
                </h1>
                <div className="text-2xl md:text-4xl 2xl:text-6xl font-mono text-[#F2A541]">
                  (1, 1, 0)
                </div>
                <div className="text-xs sm:text-sm 2xl:text-lg font-mono uppercase tracking-[0.2em] text-slate-400 mt-2">
                  ROLL FORWARD MONTHLY
                </div>
              </motion.div>
            )}

            {/* Phase 6b (14s - 24s): Capacity Commitment Protocol — Minimal Words & Phrases */}
            {beatElapsedSeconds >= 14 && beatElapsedSeconds < 24 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1.0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.7 }}
                className={`text-center z-10 flex flex-col items-center gap-6 w-full ${isTVMode ? 'max-w-6xl 2xl:max-w-7xl' : 'max-w-4xl'} px-4`}
              >
                <div className="text-center">
                  <div className="text-xs sm:text-sm 2xl:text-base font-mono uppercase tracking-[0.3em] text-[#F2A541] mb-2">
                    THREE PILLARS
                  </div>
                  <h2 className="text-4xl md:text-7xl 2xl:text-8xl font-extralight text-white tracking-tight uppercase">
                    CAPACITY COMMITMENT
                  </h2>
                </div>

                {/* Minimalist 3-Pillar Phrase Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 2xl:gap-6 w-full mt-2">
                  {/* Pillar 1: Floor */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className={`py-8 2xl:py-12 px-6 2xl:px-8 rounded-2xl border text-center flex flex-col items-center justify-center gap-3 transition-all backdrop-blur-md relative overflow-hidden ${
                      beatElapsedSeconds >= 14 && beatElapsedSeconds < 17
                        ? 'bg-[#0B2545]/90 border-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.35)] ring-1 ring-sky-400'
                        : 'bg-slate-950/70 border-slate-800'
                    }`}
                  >
                    <div className="text-xs 2xl:text-sm font-mono text-sky-400 uppercase tracking-widest font-bold">
                      01 · FLOOR
                    </div>
                    <div className="text-2xl md:text-3xl 2xl:text-4xl font-light text-white tracking-wide">
                      ARIMA (1,1,0)
                    </div>
                    <div className="text-xs 2xl:text-sm font-mono text-slate-400 uppercase tracking-wider">
                      POINT BASELINE
                    </div>
                  </motion.div>

                  {/* Pillar 2: Buffer */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.25 }}
                    className={`py-8 2xl:py-12 px-6 2xl:px-8 rounded-2xl border text-center flex flex-col items-center justify-center gap-3 transition-all backdrop-blur-md relative overflow-hidden ${
                      beatElapsedSeconds >= 17 && beatElapsedSeconds < 20.5
                        ? 'bg-[#0B2545]/90 border-amber-400 shadow-[0_0_30px_rgba(242,165,65,0.4)] ring-1 ring-amber-400'
                        : 'bg-slate-950/70 border-slate-800'
                    }`}
                  >
                    <div className="text-xs 2xl:text-sm font-mono text-[#F2A541] uppercase tracking-widest font-bold">
                      02 · BUFFER
                    </div>
                    <div className="text-2xl md:text-3xl 2xl:text-4xl font-light text-[#F2A541] tracking-wide">
                      +5%
                    </div>
                    <div className="text-xs 2xl:text-sm font-mono text-slate-400 uppercase tracking-wider">
                      FLEX CAPACITY
                    </div>
                  </motion.div>

                  {/* Pillar 3: Oversight */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className={`py-8 2xl:py-12 px-6 2xl:px-8 rounded-2xl border text-center flex flex-col items-center justify-center gap-3 transition-all backdrop-blur-md relative overflow-hidden ${
                      beatElapsedSeconds >= 20.5
                        ? 'bg-[#0B2545]/90 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400'
                        : 'bg-slate-950/70 border-slate-800'
                    }`}
                  >
                    <div className="text-xs 2xl:text-sm font-mono text-emerald-400 uppercase tracking-widest font-bold">
                      03 · OVERSIGHT
                    </div>
                    <div className="text-2xl md:text-3xl 2xl:text-4xl font-light text-white tracking-wide">
                      HUMAN SIGN-OFF
                    </div>
                    <div className="text-xs 2xl:text-sm font-mono text-slate-400 uppercase tracking-wider">
                      ETS BACKUP
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Phase 6c (28s - 44s): Final Verdict Card */}
            {beatElapsedSeconds >= 28 && beatElapsedSeconds < 44 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5 }}
                className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center p-4 sm:p-8 text-center"
              >
                {/* Background image fixed as absolute background */}
                <img
                  src={ESTABLISHING_SHOT_IMG}
                  alt="Port of Los Angeles Final Bookend"
                  className="absolute inset-0 w-full h-full object-cover brightness-[0.22] contrast-[1.15] pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060B14] via-[#060B14]/75 to-[#060B14]/85 pointer-events-none" />

                {/* Dead-center Prominently Visible Verdict Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 12 }}
                  animate={{ opacity: 1, scale: 1.0, y: 0 }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  className={`relative z-20 w-full ${isTVMode ? 'max-w-4xl 2xl:max-w-5xl p-8 sm:p-12 2xl:p-16' : 'max-w-3xl p-6 sm:p-10 md:p-12'} mx-auto flex flex-col items-center gap-5 bg-slate-950/95 rounded-3xl border-2 border-amber-500/70 shadow-[0_0_60px_rgba(242,165,65,0.35)] backdrop-blur-2xl text-center`}
                >
                  <div className="inline-flex items-center gap-2.5 px-4 py-1.5 2xl:px-5 2xl:py-2 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-300 text-xs sm:text-sm 2xl:text-base font-mono font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(242,165,65,0.3)]">
                    <span className="w-2.5 h-2.5 2xl:w-3 2xl:h-3 rounded-full bg-[#F2A541] animate-ping" />
                    <span>Industrial Engineering Final Verdict</span>
                  </div>
                  <h2 className="text-3xl sm:text-5xl md:text-6xl 2xl:text-7xl font-light text-white tracking-wide drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">
                    USE ARIMA (1, 1, 0)
                  </h2>
                  <div className="text-sm sm:text-lg md:text-xl 2xl:text-2xl font-mono text-[#F2A541] font-bold tracking-widest uppercase drop-shadow-[0_0_12px_rgba(242,165,65,0.7)] px-4 py-2 2xl:px-6 2xl:py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    +5% FLEXIBLE BUFFER · REVALIDATE QUARTERLY
                  </div>
                  <div className="text-xs sm:text-sm md:text-base 2xl:text-xl font-mono text-slate-300 tracking-wider">
                    ETS α = 0.50 SPREADSHEET AUDIT BACKUP · HUMAN CHIEF OVERRIDE
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Phase 6d (44s - 60s): Closing Slide with Team Lineup */}
            {beatElapsedSeconds >= 44 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2 }}
                className="absolute inset-0 bg-[#060B14] flex flex-col items-center justify-center gap-4 z-20 text-center px-6"
              >
                <div className="inline-flex items-center gap-2 px-3.5 py-1 2xl:px-5 2xl:py-2 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs sm:text-sm 2xl:text-base font-mono font-bold uppercase tracking-widest">
                  <span>APPLIED STUDY 1</span>
                </div>

                <div className="text-xl sm:text-3xl md:text-5xl 2xl:text-6xl font-extralight tracking-[0.2em] uppercase text-white">
                  BSIE 3-E · GROUP 7
                </div>

                {/* 3 Student Presenters Lineup */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 2xl:gap-5 w-full max-w-2xl 2xl:max-w-3xl my-1">
                  <div className="p-3 2xl:p-5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <div className="text-xs sm:text-sm 2xl:text-base font-bold text-white">Elaiza Jane Aligato</div>
                    <div className="text-[10px] sm:text-xs 2xl:text-sm font-mono text-sky-400">Speaker 1</div>
                  </div>
                  <div className="p-3 2xl:p-5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <div className="text-xs sm:text-sm 2xl:text-base font-bold text-white">Rash Mae Crystelle C. Ansay</div>
                    <div className="text-[10px] sm:text-xs 2xl:text-sm font-mono text-[#F2A541]">Speaker 2</div>
                  </div>
                  <div className="p-3 2xl:p-5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <div className="text-xs sm:text-sm 2xl:text-base font-bold text-white">Mylene Joy Villagracia</div>
                    <div className="text-[10px] sm:text-xs 2xl:text-sm font-mono text-emerald-400">Speaker 3</div>
                  </div>
                </div>

                <div className="text-xs sm:text-sm 2xl:text-base font-mono text-slate-400 tracking-wider">
                  IE-PC 3112: Operations Management 1 · Dataset D10: Port of Los Angeles
                </div>
                <div className="text-xs sm:text-sm 2xl:text-base text-sky-400 font-mono font-semibold">
                  Cebu Technological University – Main Campus
                </div>
                <p className="text-xs sm:text-sm 2xl:text-base font-serif italic text-slate-400 max-w-md">
                  Thank you for watching.
                </p>
              </motion.div>
            )}
          </div>
        )}
        </div>

        {/* ============================================================== */}
        {/* MINIMAL KEYNOTE TRANSPORT HUD                                 */}
        {/* ============================================================== */}
        <AnimatePresence>
          {(mouseActive || !isPlaying) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-x-0 bottom-0 p-4 md:p-6 bg-gradient-to-t from-[#060B14]/95 via-[#060B14]/60 to-transparent flex flex-col gap-2 z-30"
            >
              {/* Progress Scrub Bar (Exactly 7 Beats) */}
              <div className="grid grid-cols-7 gap-1.5 w-full">
                {KEYNOTE_BEATS.slice(0, 7).map((beat, idx) => {
                  const isPast = currentBeatIndex > idx;
                  const isCurrent = currentBeatIndex === idx;
                  const beatProgress = isCurrent
                    ? (beatElapsedSeconds / beat.durationSeconds) * 100
                    : isPast
                    ? 100
                    : 0;

                  return (
                    <div
                      key={beat.id}
                      onClick={() => skipToBeat(idx)}
                      className="group cursor-pointer py-1.5 flex flex-col gap-1"
                    >
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-400 group-hover:bg-[#F2A541] transition-all"
                          style={{ width: `${beatProgress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 group-hover:text-slate-300">
                        <span>{idx === 0 ? 'Intro' : `B${idx}`}</span>
                        <span>{beat.durationSeconds}s</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Control Row */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                {/* Left: Play/Pause, Replay, Time */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPlaying((p) => !p)}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>

                  <button
                    onClick={() => {
                      setCurrentBeatIndex(0);
                      setBeatElapsedSeconds(0);
                      setIsPlaying(true);
                    }}
                    className="p-2 rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-white transition-colors"
                    title="Restart from Beginning"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-white transition-colors"
                    title={isMuted ? "Unmute Ambient Bed" : "Mute Ambient Bed"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  <div className="font-mono text-[11px] text-slate-400 pl-2">
                    <span className="text-white font-bold">{formatTime(totalElapsedSeconds)}</span>
                    <span className="mx-1 text-slate-600">/</span>
                    <span>{formatTime(TOTAL_KEYNOTE_SECONDS)}</span>
                  </div>
                </div>

                {/* Center: Slide Title */}
                <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span className="text-sky-400 font-bold">
                    {currentBeat.beatNumber === 0 ? 'Prologue:' : `Beat ${currentBeat.beatNumber} of 6:`}
                  </span>
                  <span className="text-white truncate max-w-sm">{currentBeat.title}</span>
                </div>

                {/* Right: Fullscreen, TV Mode & Presenter Notes */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleTVMode}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                      isTVMode
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(242,165,65,0.7)]'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400'
                    }`}
                    title="Toggle TV / Large Screen Presentation Mode (T)"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">TV Mode</span>
                  </button>

                  <button
                    onClick={() => setShowPresenterHUD(!showPresenterHUD)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                      showPresenterHUD
                        ? 'bg-[#1B6CA8] text-white font-bold'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Teleprompter</span>
                  </button>

                  <button
                    onClick={toggleFullscreen}
                    className="p-2 rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-white transition-colors"
                    title="Toggle Fullscreen (F)"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Presenter Teleprompter HUD (Press C or click button) */}
        <AnimatePresence>
          {showPresenterHUD && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="absolute bottom-20 inset-x-4 md:inset-x-12 z-40 bg-slate-950/95 border border-[#1B6CA8]/60 p-4 rounded-xl shadow-2xl backdrop-blur-md"
            >
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-[#F2A541]" />
                  <span className="font-bold text-[#F2A541]">LIVE SPEAKER SCRIPT (Presenter-First)</span>
                  <span className="text-slate-400 font-mono">· {currentBeat.speaker}</span>
                </div>
                <button
                  onClick={() => setShowPresenterHUD(false)}
                  className="text-slate-400 hover:text-white text-xs font-mono"
                >
                  ✕ Close (C)
                </button>
              </div>
              <p className="text-sm md:text-base text-slate-200 leading-relaxed font-serif">
                "{currentBeat.livePresenterPrompt}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Export Presentation Modal */}
      <ExportPresentationModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
};
