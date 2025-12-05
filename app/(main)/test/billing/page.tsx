"use client"

import React, { useMemo, useState } from 'react'
import { ArrowUpRight, Clapperboard, Film } from 'lucide-react'

import SimpleChart from '@/components/SimpleChart'
import { CREDIT_PACKAGES, MOCK_RECHARGE_HISTORY, MOCK_TRANSACTIONS, MOCK_USAGE_HISTORY } from '@/constants'

type TimeRange = '7D' | '1M' | '3M'

const Billing: React.FC = () => {
  const [customAmount, setCustomAmount] = useState<string>('')
  const [analyticsTab, setAnalyticsTab] = useState<'usage' | 'recharge'>('usage')
  const [timeRange, setTimeRange] = useState<TimeRange>('7D')

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '')
    setCustomAmount(val)
  }

  const calculateCredits = (amount: number) => {
    const baseRate = 50 // 50 credits per dollar
    return Math.floor(amount * baseRate)
  }

  const customCredits = calculateCredits(Number(customAmount) || 0)

  // Simulate data filtering based on time range
  const chartData = useMemo(() => {
    const baseData = analyticsTab === 'usage' ? MOCK_USAGE_HISTORY : MOCK_RECHARGE_HISTORY

    // In a real app, this would fetch different datasets. 
    // Here we strictly simulate different views for the UI.
    if (timeRange === '7D') return baseData.slice(0, 7)

    // Simulate 30 days data
    if (timeRange === '1M') {
      // Just repeating data for demo purposes to fill graph
      return [...baseData, ...baseData, ...baseData, ...baseData].slice(0, 30).map((d, i) => ({
        ...d, label: `${i + 1}`
      }))
    }

    // Simulate 3 Months data
    if (timeRange === '3M') {
      return [
        { label: 'W1', value: 450 }, { label: 'W2', value: 320 }, { label: 'W3', value: 550 }, { label: 'W4', value: 400 },
        { label: 'W5', value: 300 }, { label: 'W6', value: 200 }, { label: 'W7', value: 600 }, { label: 'W8', value: 450 },
        { label: 'W9', value: 500 }, { label: 'W10', value: 380 }, { label: 'W11', value: 420 }, { label: 'W12', value: 650 },
      ]
    }

    return baseData
  }, [analyticsTab, timeRange])

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12 pb-20 fade-enter">

      {/* Header & Balance Card */}
      <div className="flex flex-col md:flex-row gap-8 items-stretch border-b border-white/5 pb-10">
        <div className="flex-1 space-y-4 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-sm"></div>
            <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest">Production Finance v2.0</span>
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tighter drop-shadow-lg font-mono">STUDIO_BUDGET</h1>
          <p className="text-zinc-500 font-mono text-xs max-w-lg leading-relaxed uppercase tracking-wide">
            [SYS_MSG]: Manage production capital. Allocate resources for rendering, generation, and storage across all active projects.
          </p>

          <div className="flex gap-4 pt-4">
            <div className="px-4 py-2 bg-zinc-900/30 border border-white/10 rounded-sm flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <span className="block text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-0.5">Active Plan</span>
                <span className="text-zinc-300 font-mono text-xs uppercase">Professional Studio</span>
              </div>
            </div>
            <div className="px-4 py-2 bg-zinc-900/30 border border-white/10 rounded-sm flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full"></div>
              <div>
                <span className="block text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-0.5">Billing Cycle</span>
                <span className="text-zinc-300 font-mono text-xs uppercase">Monthly</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-[400px] relative group perspective-1000">
          {/* Card Glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>

          {/* Industrial Equipment Chassis Look */}
          <div className="relative h-full bg-[#050505] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
            {/* Texture Overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>

            {/* Top Control Strip */}
            <div className="h-12 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border-b border-white/5 flex items-center justify-between px-4 relative z-10">
              {/* Screw Heads */}
              <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-zinc-700 shadow-[inset_0_1px_1px_rgba(0,0,0,1)] flex items-center justify-center">
                <div className="w-full h-[0.5px] bg-zinc-900 rotate-45"></div>
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-zinc-700 shadow-[inset_0_1px_1px_rgba(0,0,0,1)] flex items-center justify-center">
                <div className="w-full h-[0.5px] bg-zinc-900 rotate-45"></div>
              </div>

              <div className="pl-4 flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <div className="w-8 h-0.5 bg-zinc-700/50"></div>
                  <div className="w-8 h-0.5 bg-zinc-700/50"></div>
                  <div className="w-8 h-0.5 bg-zinc-700/50"></div>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 font-bold tracking-widest uppercase">LUMINA.SYS_V1</span>
              </div>

              <div className="pr-4 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-wider">REC</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-red-900/50 border border-red-900"></div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-wider">NET</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)] animate-pulse"></div>
                </div>
              </div>
            </div>

            <div className="p-6 flex-1 relative flex flex-col justify-between z-10">
              {/* Technical Grid Background */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[20px_20px] pointer-events-none"></div>

              <div className="relative">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-3 bg-indigo-500"></div>
                      <label className="text-[9px] font-mono text-indigo-400/80 uppercase tracking-[0.2em] block">Capacity Status</label>
                    </div>
                    <div className="flex items-baseline gap-2 font-mono relative">
                      <span className="text-5xl font-bold text-white tracking-tighter tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">850</span>
                      <div className="flex flex-col items-start -mt-1">
                        <span className="text-xs text-zinc-500 font-bold">.00</span>
                        <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Credits</span>
                      </div>
                    </div>
                  </div>

                  {/* Sensor Module Look */}
                  <div className="w-12 h-12 border border-zinc-700 bg-zinc-900/50 rounded flex items-center justify-center relative overflow-hidden group/sensor">
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(255,255,255,0.05)_2px,rgba(255,255,255,0.05)_4px)]"></div>
                    <div className="w-8 h-8 rounded-full border border-indigo-500/30 flex items-center justify-center">
                      <div className="w-4 h-4 bg-indigo-500/20 rounded-full blur-[2px] animate-pulse"></div>
                    </div>
                    <div className="absolute bottom-0.5 right-1 text-[6px] font-mono text-zinc-500">SENS_01</div>
                  </div>
                </div>

                <div className="flex justify-between items-end border-t border-white/5 pt-4">
                  <div>
                    <div className="text-[8px] text-zinc-600 font-mono uppercase tracking-widest mb-1">Unit Identifier</div>
                    <div className="font-mono text-zinc-400 text-xs tracking-widest flex gap-2">
                      <span>4291</span>
                      <span className="text-zinc-600">----</span>
                      <span className="text-zinc-600">----</span>
                      <span className="text-zinc-600">----</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] text-zinc-600 font-mono uppercase tracking-widest mb-1">Exp. Cycle</div>
                    <div className="text-xs text-zinc-300 font-mono bg-zinc-900 px-1.5 py-0.5 border border-zinc-800 rounded">12 / 28</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Area */}
            <div className="p-3 bg-black/40 border-t border-white/5 flex gap-3 backdrop-blur-sm">
              <button className="flex-1 bg-zinc-100 text-black py-2.5 rounded text-[10px] font-mono uppercase tracking-widest font-bold hover:bg-white transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
                <ArrowUpRight className="w-3 h-3" /> Initialize
              </button>
              <button className="flex-1 bg-zinc-900 text-zinc-400 py-2.5 rounded text-[10px] font-mono uppercase tracking-widest font-bold hover:text-white hover:bg-zinc-800 transition-all border border-zinc-800 flex items-center justify-center gap-2 group/btn">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover/btn:bg-indigo-500 transition-colors"></span>
                Log Access
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <section className="bg-[#050505] border border-zinc-800 rounded-sm overflow-hidden relative group">
        {/* Technical Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[40px_40px] pointer-events-none"></div>

        {/* Corner Brackets */}
        <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-zinc-500"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-zinc-500"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-zinc-500"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-zinc-500"></div>

        <div className="p-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 border-b border-zinc-800/50 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Module</span>
                <h2 className="text-sm font-mono font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                  Resource_Monitor
                </h2>
              </div>

              <div className="h-8 w-px bg-zinc-800 mx-2"></div>

              <div className="flex bg-black p-0.5 rounded-sm border border-zinc-800">
                <button
                  onClick={() => setAnalyticsTab('usage')}
                  className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider transition-all ${analyticsTab === 'usage' ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                  Burn Rate
                </button>
                <button
                  onClick={() => setAnalyticsTab('recharge')}
                  className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider transition-all ${analyticsTab === 'recharge' ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                  Injections
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest hidden md:block">Timeframe Select:</span>
              <div className="flex bg-black p-0.5 rounded-sm border border-zinc-800">
                {(['7D', '1M', '3M'] as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-[9px] font-mono font-bold transition-colors ${timeRange === range ? 'bg-indigo-900/20 text-indigo-400 border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]' : 'text-zinc-600 hover:text-zinc-400'}`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-[280px] w-full relative z-10 bg-black/40 border border-zinc-800/50 p-4 overflow-hidden backdrop-blur-sm">
            {/* Chart Grid Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[20px_20px] pointer-events-none opacity-20"></div>

            <SimpleChart
              data={chartData}
              color={analyticsTab === 'usage' ? '#f43f5e' : '#10b981'}
              label={analyticsTab === 'usage' ? 'CREDITS BURNED' : 'FUNDS ADDED'}
              unit={analyticsTab === 'usage' ? '' : '$'}
              height={240}
            />
          </div>
        </div>
      </section>

      {/* Packages Grid */}
      <section>
        <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-2">
          <Clapperboard className="w-4 h-4 text-zinc-500" />
          <h2 className="text-lg font-bold text-white tracking-tight font-mono uppercase">Acquire Resources</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Pre-defined Packages */}
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`
                group relative p-5 rounded-sm border transition-all duration-300 flex flex-col overflow-hidden
                ${pkg.popular
                  ? 'bg-zinc-900 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)] z-10'
                  : 'bg-black border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50'}
              `}
            >
              {/* Industrial Markings */}
              <div className="absolute top-2 right-2 flex gap-1">
                <div className="w-1 h-1 bg-zinc-700 rounded-full"></div>
                <div className="w-1 h-1 bg-zinc-700 rounded-full"></div>
              </div>

              {/* Tape / Film Strip Decoration */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-2 gap-2 opacity-50">
                <div className="w-0.5 h-4 bg-zinc-800"></div>
                <div className="w-0.5 h-4 bg-zinc-800"></div>
                <div className="w-0.5 h-4 bg-zinc-800"></div>
                <div className="w-0.5 h-4 bg-zinc-800"></div>
                <div className="w-0.5 h-4 bg-zinc-800"></div>
                <div className="w-0.5 h-4 bg-zinc-800"></div>
              </div>

              {pkg.popular && (
                <div className="absolute top-0 right-0 px-2 py-0.5 bg-indigo-500 text-white text-[8px] font-mono font-bold uppercase tracking-widest z-20">
                  Recommended
                </div>
              )}

              <div className="mb-4 mt-2 pl-3">
                <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest block mb-1">Capacity Unit</span>
                <div className="text-xl font-bold text-white mb-1 tracking-tighter font-mono">{pkg.credits} <span className="text-[10px] font-normal text-zinc-500 uppercase">CR</span></div>

                <div className="flex items-baseline gap-2 mt-2">
                  <div className="text-lg font-mono text-indigo-400 group-hover:text-indigo-300 transition-colors">${pkg.price}</div>
                  {pkg.originalPrice && (
                    <div className="text-[10px] text-zinc-600 line-through font-mono">${pkg.originalPrice}</div>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-zinc-500 mb-6 min-h-[30px] font-mono leading-relaxed pl-3 border-l-2 border-zinc-800">{pkg.description}</p>

              <button
                className={`
                  w-full py-2.5 rounded-sm text-[10px] font-mono uppercase tracking-widest font-bold transition-all mt-auto flex items-center justify-center gap-2 border
                  ${pkg.popular
                    ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-500 shadow-[0_4px_10px_rgba(79,70,229,0.2)]'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white hover:border-zinc-700'}
                `}
              >
                <div className="w-1.5 h-1.5 bg-current rounded-full opacity-50"></div>
                Initialize
              </button>
            </div>
          ))}

          {/* Custom Amount Card */}
          <div className="p-5 rounded-sm border border-dashed border-zinc-700 bg-transparent hover:bg-zinc-900/20 transition-all flex flex-col items-center justify-center text-center space-y-4 group">
            <div className="w-10 h-10 rounded-sm bg-zinc-900 flex items-center justify-center mb-2 border border-zinc-800 group-hover:border-zinc-600 transition-colors">
              <Film className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider">Custom Allocation</h3>
              <p className="text-[9px] text-zinc-600 mt-1 font-mono">Specify parameters</p>
            </div>

            <div className="w-full relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">$</span>
              <input
                type="text"
                value={customAmount}
                onChange={handleCustomAmountChange}
                placeholder="0.00"
                className="w-full bg-black border border-zinc-800 rounded-sm py-2 pl-6 pr-2 text-white font-mono focus:outline-none focus:border-indigo-500/50 transition-colors text-xs text-right"
              />
            </div>

            {customCredits > 0 && (
              <div className="text-[10px] font-mono text-emerald-500 bg-emerald-900/10 px-2 py-1 rounded-sm border border-emerald-900/30 w-full">
                EST: {customCredits} CR
              </div>
            )}

            <button
              disabled={!customCredits}
              className="w-full py-2.5 rounded-sm text-[10px] font-mono uppercase tracking-widest font-bold bg-zinc-200 text-black hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed transition-all mt-auto"
            >
              Authorize
            </button>
          </div>
        </div>
      </section>

      {/* Transaction History */}
      <section className="bg-black border border-zinc-800 rounded-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-zinc-600 rounded-full animate-pulse"></div>
            <h2 className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-widest">System_Logs / Ledger</h2>
          </div>
          <button className="text-[9px] font-mono text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors flex items-center gap-2 px-3 py-1 border border-indigo-500/30 hover:border-indigo-500 rounded-sm bg-indigo-500/10">
            DOWNLOAD_CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left font-mono">
            <thead className="bg-zinc-900 text-zinc-500 uppercase text-[9px] tracking-widest border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3 font-medium border-r border-zinc-800/50">Timestamp</th>
                <th className="px-6 py-3 font-medium border-r border-zinc-800/50">Operation</th>
                <th className="px-6 py-3 font-medium border-r border-zinc-800/50">Value_Change</th>
                <th className="px-6 py-3 font-medium border-r border-zinc-800/50">Cost</th>
                <th className="px-6 py-3 font-medium">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 bg-black">
              {MOCK_TRANSACTIONS.map((tx) => (
                <tr key={tx.id} className="hover:bg-zinc-900/30 transition-colors group">
                  <td className="px-6 py-3 text-zinc-500 text-[10px] group-hover:text-zinc-300 transition-colors border-r border-zinc-800/30">
                    <span className="text-zinc-700 mr-2">&gt;</span>{tx.date}
                  </td>
                  <td className="px-6 py-3 font-medium text-zinc-400 group-hover:text-white transition-colors text-xs border-r border-zinc-800/30">
                    {tx.description}
                  </td>
                  <td className={`px-6 py-3 text-xs font-bold border-r border-zinc-800/30 ${tx.credits > 0 ? 'text-emerald-500' : 'text-zinc-600'}`}>
                    {tx.credits > 0 ? '+' : ''}{tx.credits} <span className="text-[9px] font-normal opacity-50">CR</span>
                  </td>
                  <td className="px-6 py-3 text-zinc-500 text-xs border-r border-zinc-800/30">
                    {tx.amount > 0 ? `$${tx.amount.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[8px] uppercase tracking-wider font-bold border ${tx.status.toLowerCase() === 'completed'
                      ? 'bg-emerald-900/10 text-emerald-500 border-emerald-900/30'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                      [{tx.status.toUpperCase()}]
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default Billing
