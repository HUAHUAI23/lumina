"use client"

import React, { useMemo, useState } from 'react'
import { Activity, ArrowUpRight, Calendar, CreditCard, DollarSign, Sparkles, Wallet } from 'lucide-react'

import SimpleChart from '../../../components/SimpleChart'
import { CREDIT_PACKAGES, MOCK_RECHARGE_HISTORY, MOCK_TRANSACTIONS, MOCK_USAGE_HISTORY } from '../../../constants'

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
    <div className="p-8 max-w-6xl mx-auto space-y-12 pb-20">

      {/* Header & Balance Card */}
      <div className="flex flex-col md:flex-row gap-8 items-stretch">
        <div className="flex-1 space-y-2">
          <h1 className="text-3xl font-bold text-white">Wallet & Credits</h1>
          <p className="text-zinc-400">Manage your balance and view transaction history.</p>
        </div>

        <div className="w-full md:w-96 bg-gradient-to-br from-indigo-900 via-indigo-950 to-zinc-900 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="w-32 h-32 text-white" />
          </div>

          <div className="relative z-10">
            <span className="text-indigo-300 font-medium text-sm tracking-wider uppercase">Current Balance</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-bold text-white">850</span>
              <span className="text-lg text-zinc-400">credits</span>
            </div>
            <div className="mt-6 flex gap-3">
              <button className="flex-1 bg-white text-black py-2 rounded-lg font-semibold text-sm hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
                <ArrowUpRight className="w-4 h-4" /> Top Up
              </button>
              <button className="flex-1 bg-white/10 text-white py-2 rounded-lg font-semibold text-sm hover:bg-white/20 transition-colors border border-white/10">
                History
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <section className="bg-surfaceLight/30 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-zinc-400" />
              Analytics
            </h2>

            <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
              <button
                onClick={() => setAnalyticsTab('usage')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${analyticsTab === 'usage' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-zinc-300'}`}
              >
                Consumption
              </button>
              <button
                onClick={() => setAnalyticsTab('recharge')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${analyticsTab === 'recharge' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-zinc-300'}`}
              >
                Top-ups
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
              {(['7D', '1M', '3M'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${timeRange === range ? 'bg-indigo-600/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-[250px] w-full">
          <SimpleChart
            data={chartData}
            color={analyticsTab === 'usage' ? '#f43f5e' : '#10b981'}
            label={analyticsTab === 'usage' ? 'Credits Consumed' : 'Amount Recharged'}
            unit={analyticsTab === 'usage' ? '' : '$'}
            height={220}
          />
        </div>
      </section>

      {/* Packages Grid */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          Purchase Credits
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Pre-defined Packages */}
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`
                group relative p-6 rounded-2xl border transition-all duration-300 flex flex-col
                ${pkg.popular
                  ? 'bg-zinc-900 border-indigo-500 shadow-xl shadow-indigo-500/10 scale-105 z-10'
                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'}
              `}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Best Value
                </div>
              )}

              <div className="mb-4">
                <div className="text-2xl font-bold text-white mb-1">{pkg.credits} <span className="text-sm font-normal text-zinc-400">credits</span></div>
                {pkg.originalPrice && (
                  <div className="text-xs text-zinc-500 line-through mb-1">${pkg.originalPrice}</div>
                )}
                <div className="text-3xl font-bold text-white">${pkg.price}</div>
              </div>

              <p className="text-xs text-zinc-400 mb-6 min-h-[40px]">{pkg.description}</p>

              <button
                className={`
                  w-full py-2.5 rounded-xl font-semibold text-sm transition-all mt-auto flex items-center justify-center gap-2
                  ${pkg.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700 group-hover:bg-white group-hover:text-black'}
                `}
              >
                <CreditCard className="w-4 h-4" />
                Buy Now
              </button>
            </div>
          ))}

          {/* Custom Amount Card */}
          <div className="p-6 rounded-2xl border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900/20 hover:bg-zinc-900/40 transition-all flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-2">
              <DollarSign className="w-6 h-6 text-zinc-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Custom Amount</h3>
              <p className="text-xs text-zinc-500">Enter any amount to top up.</p>
            </div>

            <div className="w-full relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
              <input
                type="text"
                value={customAmount}
                onChange={handleCustomAmountChange}
                placeholder="0.00"
                className="w-full bg-black/50 border border-zinc-700 rounded-lg py-2 pl-7 pr-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {customCredits > 0 && (
              <div className="text-sm font-medium text-emerald-400">
                ≈ {customCredits} credits
              </div>
            )}

            <button
              disabled={!customCredits}
              className="w-full py-2.5 rounded-xl font-semibold text-sm bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-auto"
            >
              Pay Now
            </button>
          </div>
        </div>
      </section>

      {/* Transaction History */}
      <section className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <button className="text-sm text-indigo-400 hover:text-indigo-300">Download Invoice</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900/50 text-zinc-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Credits</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {MOCK_TRANSACTIONS.map((tx) => (
                <tr key={tx.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-6 py-4 text-zinc-300">{tx.date}</td>
                  <td className="px-6 py-4 font-medium text-white">{tx.description}</td>
                  <td className={`px-6 py-4 font-mono font-medium ${tx.credits > 0 ? 'text-green-400' : 'text-zinc-400'}`}>
                    {tx.credits > 0 ? '+' : ''}{tx.credits}
                  </td>
                  <td className="px-6 py-4 text-zinc-300">
                    {tx.amount > 0 ? `$${tx.amount.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/20">
                      {tx.status}
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

export default Billing;

