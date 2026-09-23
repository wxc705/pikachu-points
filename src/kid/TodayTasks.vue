<template>
  <div class="tt-page" :class="{ 'tt-page--sidebar': isWide }">
    <!-- 角色壁纸：三件套之一，半透明垫最底层（pointer-events 不挡交互） -->
    <div class="tt-wall" :style="{ backgroundImage: `url(/ultraman/seq/${ultraChar.key}/${ultraChar.wall})` }"></div>
    <!-- 左侧导航栏（宽屏 ≥769px：桌面+iPad 横版统一显示，同设计稿） -->
    <nav v-if="isWide" class="tt-sidebar">
      <div class="sb-avatar">
        <img :src="`/ultraman/seq/${ultraChar.key}/avatar.jpg`" :alt="ultraChar.name" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
        <span class="sb-avatar-emoji" style="display:none">{{ ultramanEmoji }}</span>
        <span class="sb-avatar-level">{{ levelLabel }}</span>
      </div>
      <button class="sb-item" :class="{ 'is-active': activeTab === 'today' }" @click="activeTab = 'today'">
        <span class="sb-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg></span>
        冒险
      </button>
      <button class="sb-item" :class="{ 'is-active': activeTab === 'points' }" @click="activeTab = 'points'">
        <span class="sb-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9z"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9z"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></span>
        基地
      </button>
      <button class="sb-item" :class="{ 'is-active': activeTab === 'apply' }" @click="activeTab = 'apply'">
        <span class="sb-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg></span>
        商城
      </button>
      <button class="sb-item" :class="{ 'is-active': activeTab === 'settings' }" @click="activeTab = 'settings'">
        <span class="sb-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></span>
        设置
      </button>
      <div class="sb-spacer"></div>
      <a class="sb-item sb-parent" href="#/">
        <span class="sb-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
        家长端
      </a>
    </nav>

    <!-- 主内容区 -->
    <div class="tt-main-area">
      <!-- 顶部英雄区（v4） -->
      <HeroSection
        :date="store.today"
        :total-points="store.totalPoints"
        :today-earned="store.todayTaskEarned + store.todayHomeworkEarned"
        :streak="store.currentStreak"
        :level="ultramanLevel"
        :level-label="levelLabel"
        :level-progress="levelProgress"
        :level-next-days="levelNextDays"
      />

      <!-- 时间条（设计稿：始终显示） -->
      <div class="tt-time-bar" v-if="currentTimelineSlot">
        <div class="tt-tb-left">⏰ <span class="tt-tb-time">{{ String(Math.floor(nowMinutes / 60)).padStart(2, '0') }}:{{ String(nowMinutes % 60).padStart(2, '0') }}</span></div>
        <div style="text-align:right">
          <div class="tt-tb-right">当前：<span class="tt-tb-slot">{{ currentTimelineSlot.label }}</span></div>
          <div v-if="nextTimelineSlot" class="tt-tb-next">下一个：{{ nextTimelineSlot.label }} · 还有 {{ minutesUntilNext }} 分钟</div>
          <div v-else class="tt-tb-next tt-tb-done">今天的任务都完成啦！</div>
        </div>
      </div>

      <!-- 顶部进度条 = 每日进度（当天完成度，隔天清零） -->
      <div class="tt-xp-section">
        <div class="tt-xp-labels">
          <span class="tt-xp-current">🌞 今日进度</span>
          <span v-if="dailyTotal">{{ dailyDone }} / {{ dailyTotal }} 完成</span>
          <span v-else>今天没有任务</span>
        </div>
        <div class="tt-xp-track" @click="debugTriggerMorph" style="cursor:pointer" title="点击触发变身（调试入口）">
          <div class="tt-xp-fill" :style="{ width: dailyProgress + '%' }"></div>
        </div>
      </div>

      <!-- 说话气泡（v4） -->
      <SpeechBubble :text="bubbleText" :emoji="bubbleEmoji" :trigger="bubbleTrigger" />

      <!-- 全勤庆祝（v4） -->
      <AllDoneEffect :show="showAllDone" :total-earned="store.todayTaskEarned + store.todayHomeworkEarned" @close="showAllDone = false" />

    <!-- 主体：按 activeTab 切换 -->
    <main class="tt-body">
      <!-- 今日任务（v4 双栏：学校作业 + 自我拓展） -->
      <section v-if="activeTab === 'today'" class="tt-today">
        <div v-if="loading" class="tt-loading" aria-label="加载中">⏳</div>
        <div v-else-if="!store.todayTasks.length && !store.todayHomework.length" class="tt-empty">
          <div class="tt-empty-emoji">🎈</div>
          <div class="tt-empty-title">今天没有任务哦</div>
          <div class="tt-empty-hint">好好休息，去玩吧！</div>
        </div>
        <div v-else class="tt-dual">
          <!-- 左栏：学校作业 -->
          <div class="tt-column">
            <div class="tt-col-head">
              <div class="tt-col-head-left">
                <div class="tt-col-icon is-school">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <h2>学校任务</h2>
              </div>
              <span class="tt-col-badge is-xp" v-if="store.todayHomework.length">+{{ store.todayHomework.length }} 进度</span>
            </div>
            <div v-if="!store.todayHomework.length" class="tt-col-empty">
              <span class="tt-col-empty-emoji">📝</span>
              <span class="tt-col-empty-text">还没有作业哦</span>
            </div>
            <div v-else class="tt-list">
              <div
                v-for="(task, i) in store.todayHomework"
                :key="task.key"
                class="tt-card-wrap"
                :style="entryStyle(i)"
              >
                <div class="tt-task" :class="{ 'is-done': task.done }" @click="tapHomework(task)">
                  <button class="tt-card-x" :aria-label="'删除 ' + task.name" @click.stop="askRemove(task, 'hw')">✕</button>
                  <div class="tt-task-emoji">{{ emojiForName(task.name) }}</div>
                  <div class="tt-task-info">
                    <div class="tt-task-name">{{ task.name }}</div>
                    <div class="tt-task-meta"><span class="xp-tag">+{{ task.points }} 变身进度</span></div>
                  </div>
                  <button class="tt-btn" :class="task.done ? 'is-done' : 'is-go'" :disabled="task.done || busy.has(task.key)">
                    <span class="tt-btn-icon">
                      <svg v-if="task.done" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                      <svg v-else viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    </span>
                    <span class="tt-btn-label">{{ task.done ? '已完成' : '闯关' }}</span>
                  </button>
                </div>
              </div>
            </div>
            <div class="tt-col-progress">
              <div class="tt-progress-bar">
                <div class="tt-progress-fill" :style="{ width: homeworkProgressPct + '%' }"></div>
              </div>
              <span class="tt-progress-text">{{ homeworkDoneCount }}/{{ store.todayHomework.length }} 完成</span>
            </div>
            <div class="tt-badges" v-if="store.todayHomework.length">
              <div v-for="t in store.todayHomework" :key="t.key" class="tt-badge" :class="{ 'is-locked': !t.done }">
                {{ emojiForName(t.name) }}
              </div>
            </div>
            <button class="tt-temp-add" @click="openTempHw">➕ 临时补录作业</button>
          </div>

          <!-- 右栏：自我拓展 -->
          <div class="tt-column">
            <div class="tt-col-head">
              <div class="tt-col-head-left">
                <div class="tt-col-icon is-expand">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                </div>
                <h2>自我拓展</h2>
              </div>
              <span class="tt-col-badge is-pts" v-if="store.todayTasks.length">+{{ store.todayTasks.reduce((s, t) => s + t.points, 0) }} 积分</span>
            </div>
            <div v-if="!store.todayTasks.length" class="tt-col-empty">
              <span class="tt-col-empty-emoji">🌟</span>
              <span class="tt-col-empty-text">今天没有拓展任务</span>
            </div>
            <div v-else class="tt-list">
              <div
                v-for="(task, i) in store.todayTasks"
                :key="task.id"
                class="tt-card-wrap"
                :style="entryStyle(i)"
              >
                <div class="tt-task" :class="cardClass(task)" @click="tapTask(task)">
                  <button class="tt-card-x" :aria-label="'删除 ' + task.name" @click.stop="askRemove(task, 'task')">✕</button>
                  <div class="tt-task-emoji">{{ emojiForTask(task) }}</div>
                  <div class="tt-task-info">
                    <div class="tt-task-name">{{ task.name }}</div>
                    <div class="tt-task-meta">
                      <span class="pt-tag">+{{ task.points }} 积分</span>
                      <template v-if="task.timeSlot"> · <span class="xp-tag">{{ slotLabel(task.timeSlot) }}</span></template>
                    </div>
                  </div>
                  <button class="tt-btn" :class="isDone(task) ? 'is-done' : 'is-go'" :disabled="isDone(task) || busy.has(task.id)">
                    <span class="tt-btn-icon">
                      <svg v-if="isDone(task)" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                      <svg v-else viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    </span>
                    <span class="tt-btn-label">{{ isDone(task) ? '已完成' : '闯关' }}</span>
                  </button>
                  <Transition name="tt-float">
                    <span
                      v-if="floating && floating.taskId === task.id"
                      class="tt-float-points"
                      :key="floating.nonce"
                    >+{{ task.points }}</span>
                  </Transition>
                </div>
              </div>
            </div>
            <div class="tt-col-progress">
              <div class="tt-progress-bar">
                <div class="tt-progress-fill" :style="{ width: expansionProgressPct + '%' }"></div>
              </div>
              <span class="tt-progress-text">{{ expansionDoneCount }}/{{ store.todayTasks.length }} 完成</span>
            </div>
            <div class="tt-badges" v-if="store.todayTasks.length">
              <div v-for="t in store.todayTasks" :key="t.id" class="tt-badge" :class="{ 'is-locked': !isDone(t) }">
                {{ emojiForTask(t) }}
              </div>
            </div>
            <button class="tt-temp-add" @click="openTempTask">➕ 临时补录闯关</button>
          </div>
        </div>

        <!-- 今日时间段（设计稿：settings-card 在双栏下方，主页面常驻） -->
        <div class="tt-settings-card">
          <h3 class="tt-settings-title">
            <span class="tt-settings-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
            今日时间段
          </h3>
          <div class="tt-tl-list">
            <div
              v-for="(slot, i) in timelineSlots"
              :key="i"
              class="tt-tl-slot"
              :class="{ 'is-current': slot.state === 'current', 'is-past': slot.state === 'past' }"
            >
              <div class="tt-tl-time">
                <span class="tt-tl-icon">{{ slot.icon }}</span>
                <span class="tt-tl-hour">{{ slot.time }}</span>
              </div>
              <div class="tt-tl-line"></div>
              <div class="tt-tl-content">
                {{ slot.label }}
                <span v-if="slot.state === 'current'" class="tt-tl-now">← 当前</span>
              </div>
            </div>
          </div>
          <button class="btn-import" @click="importWeeklySchedule">
            <span class="tt-settings-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg></span>
            导入本周时间表
          </button>
          <p v-if="importMsg" class="tt-wish-msg" :class="importMsg.startsWith('✅') ? 'is-ok' : 'is-err'">{{ importMsg }}</p>
        </div>
      </section>

      <!-- 我的基地（v4：积分 + 成就墙） -->
      <section v-else-if="activeTab === 'points'" class="tt-points">
        <div class="tt-score-card">
          <span class="tt-score-label">💰 我的积分</span>
          <span class="tt-score-num">{{ totalPointsText }}</span>
        </div>
        <div class="tt-stats">
          <div class="tt-stat">
            <span class="tt-stat-icon">🔥</span>
            <span class="tt-stat-num">{{ streak }}天</span>
            <span class="tt-stat-label">连续打卡</span>
          </div>
          <div class="tt-stat">
            <span class="tt-stat-icon">🎯</span>
            <span class="tt-stat-num">+{{ store.todayTaskEarned }}</span>
            <span class="tt-stat-label">今日已得</span>
          </div>
        </div>
        <div class="tt-records">
          <h3 class="tt-records-title">最近打卡</h3>
          <div v-if="!recentCheckins.length" class="tt-records-empty">还没有打卡记录哦</div>
          <div v-for="(c, i) in recentCheckins" :key="c.id ?? 'rec-' + i" class="tt-record">
            <span class="tt-record-emoji">{{ emojiForName(c.projectName) }}</span>
            <div class="tt-record-mid">
              <span class="tt-record-name">{{ c.projectName }}</span>
              <span class="tt-record-date">{{ c.date }}</span>
            </div>
            <span class="tt-record-points" :class="c.pointsEarned < 0 ? 'is-neg' : ''">{{ c.pointsEarned > 0 ? '+' : '' }}{{ c.pointsEarned }}</span>
          </div>
        </div>
        <!-- 成就墙 -->
        <div class="tt-achieve">
          <div class="tt-achieve-head">
            <h3 class="tt-records-title">🏆 我的成就</h3>
            <span class="tt-achieve-count">{{ store.unlockedCount }}/{{ store.ACHIEVEMENT_DEFS.length }}</span>
          </div>
          <div class="tt-achieve-grid">
            <div
              v-for="a in store.achievements"
              :key="a.id"
              class="tt-achieve-badge"
              :class="{ 'is-locked': !a.unlocked }"
              @click="selectedAchievement = a"
            >
              <span class="tt-achieve-emoji">{{ a.unlocked ? a.emoji : '🔒' }}</span>
              <span class="tt-achieve-name">{{ a.unlocked ? a.name : '???' }}</span>
            </div>
          </div>
        </div>
        <!-- 成就详情弹窗 -->
        <Teleport to="body">
          <Transition name="tt-pop">
            <div v-if="selectedAchievement" class="tt-confirm-overlay" @click.self="selectedAchievement = null">
              <div class="tt-confirm-card">
                <div class="tt-confirm-emoji">{{ selectedAchievement.unlocked ? selectedAchievement.emoji : '🔒' }}</div>
                <div class="tt-confirm-name">{{ selectedAchievement.name }}</div>
                <div class="tt-confirm-points" style="font-size:18px;color:#666;">{{ selectedAchievement.desc }}</div>
                <div v-if="!selectedAchievement.unlocked" style="margin-top:8px;font-size:16px;color:#ea580c;font-weight:700;">
                  继续努力，就能解锁！
                </div>
                <button class="tt-confirm-no" @click="selectedAchievement = null">关闭</button>
              </div>
            </div>
          </Transition>
        </Teleport>
      </section>

      <!-- 积分商城（v4） -->
      <section v-else-if="activeTab === 'apply'" class="tt-mall">
        <div class="tt-mall-header">
          <h2 class="tt-title">🛒 积分商城</h2>
          <span class="tt-mall-balance">当前 {{ totalPointsText }} 分</span>
        </div>

        <div v-if="!rewards.length" class="tt-empty">
          <div class="tt-empty-emoji">🎁</div>
          <div class="tt-empty-title">还没有奖品哦</div>
          <div class="tt-empty-hint">让爸爸妈妈去添加奖品吧！</div>
        </div>

        <div v-else class="tt-mall-list">
          <div
            v-for="(reward, i) in rewards"
            :key="reward.id"
            class="tt-mall-card"
            :class="{ 'is-affordable': canAfford(reward), 'is-expensive': !canAfford(reward) }"
            :style="entryStyle(i)"
            @click="tapReward(reward)"
          >
            <span class="tt-mall-emoji">{{ reward.emoji || '🎁' }}</span>
            <div class="tt-mall-info">
              <span class="tt-mall-name">{{ reward.name }}</span>
              <span class="tt-mall-cost">{{ reward.points }} 分</span>
            </div>
            <div class="tt-mall-status">
              <span v-if="canAfford(reward)" class="tt-mall-yes">✅ 可以兑换</span>
              <span v-else class="tt-mall-no">⏳ 还差 {{ reward.points - store.totalPoints }} 分</span>
            </div>
          </div>
        </div>

        <!-- 自定义愿望入口 -->
        <button class="tt-mall-wish" @click="showWishInput = !showWishInput">
          ✨ 自定义愿望
        </button>
        <div v-if="showWishInput" class="tt-wish-form">
          <input
            v-model="wishText"
            placeholder="我想要..."
            class="tt-wish-input"
            @keyup.enter="submitWish"
          />
          <button class="tt-wish-btn" :disabled="!wishText.trim() || wishSaving" @click="submitWish">
            {{ wishSaving ? '...' : '提交' }}
          </button>
        </div>
        <p v-if="wishMsg" class="tt-wish-msg" :class="wishMsg.startsWith('✅') ? 'is-ok' : 'is-err'">{{ wishMsg }}</p>

        <!-- 兑换确认弹窗 -->
        <Teleport to="body">
          <Transition name="tt-pop">
            <div v-if="confirmReward" class="tt-confirm-overlay" @click.self="confirmReward = null">
              <div class="tt-confirm-card">
                <div class="tt-confirm-emoji">{{ confirmReward.emoji || '🎁' }}</div>
                <div class="tt-confirm-name">{{ confirmReward.name }}</div>
                <div class="tt-confirm-points">扣 {{ confirmReward.points }} 分</div>
                <button class="tt-confirm-yes" :disabled="mallSubmitting" @click="onConfirmReward">✅ 兑换</button>
                <button class="tt-confirm-no" @click="confirmReward = null">❌ 再想想</button>
              </div>
            </div>
          </Transition>
        </Teleport>
      </section>

      <!-- 设置（v4：返回家长端） -->
      <section v-else class="tt-settings-page">
        <!-- 设置入口 -->
        <div class="tt-settings">
          <a class="tt-settings-link" href="#/">👨‍👩‍👧 返回家长端</a>
        </div>
      </section>
    </main>
    </div><!-- /tt-main-area -->

    <!-- 底部导航：手机竖版用（iPad 用左侧栏） -->
    <nav v-if="!isWide" class="tt-tabs">
      <button class="tt-tab" :class="{ 'is-active': activeTab === 'today' }" @click="activeTab = 'today'">📋 冒险</button>
      <button class="tt-tab" :class="{ 'is-active': activeTab === 'points' }" @click="activeTab = 'points'">🏆 基地</button>
      <button class="tt-tab" :class="{ 'is-active': activeTab === 'apply' }" @click="activeTab = 'apply'">🛒 商城</button>
      <button class="tt-tab" :class="{ 'is-active': activeTab === 'settings' }" @click="activeTab = 'settings'">⚙️ 设置</button>
    </nav>

    <!-- 确认弹窗 -->
    <Teleport to="body">
      <Transition name="tt-pop">
        <div v-if="confirmTask" class="tt-confirm-overlay" @click.self="onCancel">
          <div class="tt-confirm-card">
            <div class="tt-confirm-emoji">{{ emojiForTask(confirmTask) }}</div>
            <div class="tt-confirm-name">{{ confirmTask.name }}</div>
            <div class="tt-confirm-points">+{{ confirmTask.points }} 分</div>
            <button class="tt-confirm-yes" :disabled="submitting" @click="onConfirm">✅ 完成啦</button>
            <button class="tt-confirm-no" @click="onCancel">❌ 还没好</button>
          </div>
        </div>
      </Transition>

      <!-- 临时补录：学校作业（+变身进度） -->
      <div v-if="tempHw.show" class="tt-confirm-overlay" @click.self="cancelTempHw">
        <div class="tt-confirm-card">
          <div class="tt-confirm-emoji">📝</div>
          <div class="tt-confirm-name">临时补录作业</div>
          <input v-model="tempHw.name" class="tt-temp-input" maxlength="20" placeholder="做了什么作业？" @keyup.enter="confirmTempHw" />
          <div class="tt-confirm-points" style="font-size:18px">+1 变身进度</div>
          <button class="tt-confirm-yes" :disabled="tempHw.busy || !tempHw.name.trim()" @click="confirmTempHw">✅ 加上并打卡</button>
          <button class="tt-confirm-no" @click="cancelTempHw">❌ 取消</button>
        </div>
      </div>

      <!-- 临时补录：自我拓展（进度 + 自选积分） -->
      <div v-if="tempTask.show" class="tt-confirm-overlay" @click.self="cancelTempTask">
        <div class="tt-confirm-card">
          <div class="tt-confirm-emoji">🌟</div>
          <div class="tt-confirm-name">临时补录闯关</div>
          <input v-model="tempTask.name" class="tt-temp-input" maxlength="20" placeholder="做了什么挑战？" @keyup.enter="confirmTempTask" />
          <div class="tt-pts-chips">
            <button
              v-for="p in TEMP_POINTS"
              :key="p"
              class="tt-pts-chip"
              :class="{ 'is-on': tempTask.points === p }"
              @click="tempTask.points = p"
            >{{ p }} 分</button>
          </div>
          <div class="tt-confirm-points" style="font-size:20px">+{{ tempTask.points }} 积分</div>
          <button class="tt-confirm-yes" :disabled="tempTask.busy || !tempTask.name.trim()" @click="confirmTempTask">✅ 加上并打卡</button>
          <button class="tt-confirm-no" @click="cancelTempTask">❌ 取消</button>
        </div>
      </div>

      <!-- 临时删除：从今天去掉（打卡/积分回滚） -->
      <div v-if="removeTarget" class="tt-confirm-overlay" @click.self="cancelRemove">
        <div class="tt-confirm-card">
          <div class="tt-confirm-emoji">🗑️</div>
          <div class="tt-confirm-name">{{ removeTarget.task.name }}</div>
          <div class="tt-confirm-points" style="font-size:15px">
            从今天的进度里去掉{{ removeTarget.kind === 'hw' ? '，变身进度收回' : '，积分和进度都退回' }}
          </div>
          <button class="tt-confirm-yes" :disabled="removing" @click="confirmRemove">🗑 确定去掉</button>
          <button class="tt-confirm-no" @click="cancelRemove">💚 先留着</button>
        </div>
      </div>
    </Teleport>

    <!-- TODO: QC提供变身GIF后替换此占位 -->
    <Teleport to="body">
      <Transition name="tt-pop">
        <div v-if="showMorph" class="tt-morph-overlay" @click="closeMorph">
          <div class="tt-morph-card">
            <img v-if="morphImgOk" class="tt-morph-gif" :src="`/ultraman/seq/${ultraChar.key}/morph.gif`" :alt="ultraChar.name" @error="morphImgOk = false" />
            <div v-else class="tt-morph-emoji">🔥→🦸</div>
            <div class="tt-morph-text">{{ ultraChar.name }} 变身！</div>
            <div class="tt-morph-hint">点击关闭</div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePointsStore } from '../stores/points.js'
import { dateToWeekday, WEEKDAYS } from '../utils/weekday.js'
import { playCoin, unlockAudio } from '../services/sound.js'
import { getCharToday, markMorphToday } from '../services/ultraSeq.js'
import { speakEncouragement, speakAllDone, speakText, warmUpVoice } from '../services/voice.js'
import HeroSection from '../components/HeroSection.vue'
import SpeechBubble from '../components/SpeechBubble.vue'
import AllDoneEffect from '../components/AllDoneEffect.vue'
import './kid-style.css'

const store = usePointsStore()

const activeTab = ref('today')
const loading = ref(true)
const confirmTask = ref(null)
const submitting = ref(false)
const busy = ref(new Set()) // 打卡后 3 秒防抖，防 6 岁孩子狂点
const floating = ref(null) // { taskId, points, nonce }

// v4 新状态
const bubbleText = ref('')
const bubbleEmoji = ref('⭐')
const bubbleTrigger = ref(0)
const showAllDone = ref(false)
let _allDoneFired = false // 同一天只弹一次

// v4: 积分商城
const showWishInput = ref(false)
const wishText = ref('')
const wishSaving = ref(false)
const wishMsg = ref('')
const confirmReward = ref(null)
const mallSubmitting = ref(false)

// v4: 成就详情
const selectedAchievement = ref(null)

// Phase 4: 导入本周时间表
const importMsg = ref('')
async function importWeeklySchedule() {
  try {
    // 幂等导入：seedWeeklyTasksIfEmpty 只在 weekly_tasks 表为空时导入
    // （不 splice 内存数组——那会造成 store 与 IndexedDB 不一致）
    const ok = await store.seedWeeklyTasksIfEmpty()
    importMsg.value = ok ? '✅ 本周时间表已导入' : 'ℹ️ 课表已存在，无需重复导入'
    setTimeout(() => { importMsg.value = '' }, 3000)
  } catch (e) {
    // 失败必须如实报错，不谎报成功
    console.warn('[kid] import weekly schedule failed:', e)
    importMsg.value = '❌ 导入失败：' + (e && e.message ? e.message : '未知错误')
    setTimeout(() => { importMsg.value = '' }, 5000)
  }
}

// Phase 4: 变身动画 —— QC 规则(2026-09-23)：当天「今日进度」打满触发（每天一次），
// 角色 = ultraSeq 序列当前位（周一清零、打满次日推进，详见 services/ultraSeq.js）
const ultraChar = getCharToday()
const showMorph = ref(false)
const morphImgOk = ref(true)
// 调试入口：点击 XP 进度条也触发变身（方便验收，生产可移除）
function debugTriggerMorph() { triggerMorph() }
function triggerMorph() {
  if (showMorph.value) return
  showMorph.value = true
  morphImgOk.value = true
  showAllDone.value = false // 进度满由变身唱主角，避免双弹层叠着关
  try { speakText('变身！' + ultraChar.name) } catch (_) {}
  setTimeout(() => { showMorph.value = false }, 3000)
}
function closeMorph() { showMorph.value = false }

// v4: 今日时间线 — 固定时钟锚点 + 当天课表动态生成（每天不同，如周二18:00写字课）
// 吃饭时间按 xlsx：周三体能课17:00-18:00，吃饭18:00；其余平日17:30
const MEAL_TIME = { 1: '17:30', 2: '17:30', 3: '18:00', 4: '17:30', 5: '17:30' }

function timelineMin(hhmm) {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '')
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}
// 解析时段终点: '18:00-20:00' -> 1200（无终点返回 null）
function timelineEnd(hhmm) {
  const m = /-\s*(\d{1,2}):(\d{2})/.exec(hhmm || '')
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

const timelineSlots = computed(() => {
  const now = nowMinutes.value
  const rawWd = new Date().getDay()
  const wd = rawWd === 0 ? 7 : rawWd
  const weekend = wd >= 6
  const fmt = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`

  // 当天闯关任务按时段起点分组: startMin -> { names, icon, endMin(该起点任务的最晚终点) }
  const slotMap = {}
  for (const t of store.todayTasks) {
    const s = timelineMin(t.timeSlot)
    if (s == null) continue // '早晨' 等无具体时间的不进时间线
    if (!slotMap[s]) slotMap[s] = { names: [], icon: emojiForTask(t), endMin: null }
    slotMap[s].names.push(t.name)
    const e = timelineEnd(t.timeSlot)
    if (e != null && e > s) slotMap[s].endMin = Math.max(slotMap[s].endMin || 0, e)
  }

  // 任务真实跨度（起点<终点）—— 被长时段任务覆盖的固定锚点要剔除
  // 例：周二写字课 18:00-20:00（xlsx合并格），18:30/19:30 的作业与提高、自由安排锚点
  //     不该出现，18:30-20:00 时间线应停留在写字课
  const taskSpans = Object.entries(slotMap)
    .map(([s, g]) => ({ start: Number(s), end: g.endMin }))
    .filter((sp) => sp.end != null && sp.end > sp.start)
  const coveredByTask = (k) =>
    slotMap[k] == null && taskSpans.some((sp) => sp.start < k && k < sp.end)

  const entries = []
  const push = (min, icon, label) => entries.push({ time: fmt(min), icon, label, startMin: min })

  if (!weekend) {
    push(420, '🌅', '起床 + 洗漱 + 早餐')
    push(460, '🎒', '出发上学')
    push(970, '🏫', '放学')
  }

  const mealMin = weekend ? null : timelineMin(MEAL_TIME[wd])
  // 平日固定锚点(到家/作业与提高/自由安排)必须无条件出现，即使该时段当天没有积分项
  const fixedKeys = weekend ? [] : [990, 1110, 1170]
  const keys = new Set([
    ...Object.keys(slotMap).map(Number),
    ...(mealMin != null && !coveredByTask(mealMin) ? [mealMin] : []),
    ...fixedKeys.filter((k) => !coveredByTask(k))
  ])

  for (const s of [...keys].sort((a, b) => a - b)) {
    const g = slotMap[s]
    const names = g ? g.names.join(' · ') : ''
    if (!weekend && s === 990) push(s, '🏠', names ? `到家 · ${names}` : '到家 · 按课表闯关')
    else if (mealMin != null && s === mealMin && !g) push(s, '🍚', '吃饭')
    else if (!weekend && s === 1110) push(s, '📝', names ? `作业与提高 · ${names}` : '作业与提高')
    else if (!weekend && s === 1170) push(s, '🎮', names ? `自由安排(含阅读30分钟) · 今有 ${names}` : '自由安排(含阅读30分钟)')
    else push(s, g ? g.icon : '⏰', names || fmt(s))
  }

  if (!weekend) {
    if (!keys.has(1230)) push(1230, '🪥', '洗漱准备睡觉')
    if (!keys.has(1260)) push(1260, '🌙', '睡觉')
  } else if (!keys.has(1260)) {
    push(1260, '🌙', '睡觉')
  }

  entries.sort((a, b) => a.startMin - b.startMin)

  return entries.map((slot, i) => {
    const nextStart = i < entries.length - 1 ? entries[i + 1].startMin : 9999
    let state = 'future'
    if (now >= nextStart) state = 'past'
    else if (now >= slot.startMin) state = 'current'
    return { ...slot, state }
  })
})

// v4: 积分商城 — 奖品列表（projects 表中 category='兑换' 的项目）
const rewards = computed(() => {
  return store.projects.filter((p) => p.category === '兑换' && p.isActive !== false)
})

function canAfford(reward) {
  return store.totalPoints >= (reward.points || 0)
}

async function tapReward(reward) {
  if (!canAfford(reward)) {
    wishMsg.value = `还差 ${reward.points - store.totalPoints} 分，继续努力！`
    setTimeout(() => { wishMsg.value = '' }, 3000)
    return
  }
  confirmReward.value = reward
}

async function onConfirmReward() {
  const reward = confirmReward.value
  if (!reward) return
  mallSubmitting.value = true
  try {
    await store.addRequest(reward.name, reward.points, '商城兑换')
    wishMsg.value = `✅ 已提交「${reward.name}」兑换申请`
    confirmReward.value = null
    setTimeout(() => { wishMsg.value = '' }, 3000)
  } catch (e) {
    wishMsg.value = '❌ 提交失败'
  } finally {
    mallSubmitting.value = false
  }
}

async function submitWish() {
  const text = wishText.value.trim()
  if (!text) return
  wishSaving.value = true
  try {
    await store.addRequest(text, 0, '自定义愿望')
    wishMsg.value = `✅ 愿望「${text}」已提交`
    wishText.value = ''
    showWishInput.value = false
    setTimeout(() => { wishMsg.value = '' }, 3000)
  } catch (e) {
    wishMsg.value = '❌ 提交失败'
  } finally {
    wishSaving.value = false
  }
}

// 当前分钟数（自 0:00），每分钟刷新用于时段高亮
function nowToMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}
const nowMinutes = ref(nowToMinutes())

// ---- 日期展示（HeroSection 内部处理，这里保留供底部 tab 用 ----

// 宽屏检测（设计稿：≥769px 显示侧栏布局，≤768px 手机隐藏侧栏走底部tab）
const viewportW = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
const isWide = computed(() => viewportW.value >= 769)
const wdLabel = computed(() => {
  const [y, m, d] = store.today.split('-').map(Number)
  const wd = dateToWeekday(new Date(y, m - 1, d))
  const info = WEEKDAYS.find((w) => w.n === wd) || WEEKDAYS[0]
  return info.short
})
const mdLabel = computed(() => {
  const [, m, d] = store.today.split('-')
  return `${Number(m)}.${Number(d)}`
})

const totalPointsText = computed(() => store.totalPoints.toLocaleString('en-US'))
const streak = computed(() => store.currentStreak)

// v4: 英雄区等级计算
const ultramanLevel = computed(() => {
  const s = streak.value
  if (s >= 30) return 5
  if (s >= 14) return 4
  if (s >= 7) return 3
  if (s >= 3) return 2
  return 1
})
const levelLabel = computed(() => {
  const s = streak.value
  if (s === 0) return '准备变身'
  return `奥特曼 Lv.${ultramanLevel.value}`
})
// 触发已改为「当天进度打满」（QC 规则，watch 移到 dailyProgress 定义之后注册）
const LEVEL_THRESHOLDS = [0, 1, 3, 7, 14, 30] // 索引 0-5
// 升级进度 = 每周（连续打卡天数，v4升级逻辑：中断回退到上一天等级，1/3/7/14/30天）
const levelProgress = computed(() => {
  const s = streak.value
  const lv = ultramanLevel.value
  if (lv >= 5) return 100
  const current = LEVEL_THRESHOLDS[lv] || 0
  const next = LEVEL_THRESHOLDS[lv + 1] || 30
  // clamp：streak 可能低于当前等级阈值（如 lv=1 但 s=0），避免负数进度
  return Math.max(0, Math.min(100, Math.round(((s - current) / (next - current)) * 100)))
})

// 顶部进度条 = 每日：今日（作业+拓展）完成度，当天归零重新累计
const dailyTotal = computed(() => store.todayHomework.length + store.todayTasks.length)
const dailyDone = computed(
  () =>
    store.todayHomework.filter((t) => t.done).length +
    store.todayTasks.filter((t) => isDone(t)).length
)
const dailyProgress = computed(() =>
  dailyTotal.value > 0 ? Math.round((dailyDone.value / dailyTotal.value) * 100) : 0
)
// QC 规则：当天进度打满触发变身（每天一次）；打满标记指针待推进，次日换下一个角色
watch([dailyDone, dailyTotal], () => {
  if (dailyTotal.value > 0 && dailyDone.value >= dailyTotal.value && markMorphToday()) {
    triggerMorph()
  }
})
const levelNextDays = computed(() => {
  const s = streak.value
  const lv = ultramanLevel.value
  if (lv >= 5) return '已满级'
  const next = LEVEL_THRESHOLDS[lv + 1] || 30
  const diff = next - s
  return `差 ${diff} 天升级`
})

// v4.1: 奥特曼 emoji 映射
const ULTRAMAN_EMOJIS = ['⚡', '🦸', '🦸‍♂️', '🌟', '🌍', '💎', '👑']
const ultramanEmoji = computed(() => {
  const lv = ultramanLevel.value
  return ULTRAMAN_EMOJIS[Math.min(lv - 1, ULTRAMAN_EMOJIS.length - 1)] || '⚡'
})

// v4.1: 时段指示器（基于动态 timelineSlots，随当天课表变化）
const currentTimelineSlot = computed(() => {
  const now = nowMinutes.value
  const list = timelineSlots.value
  for (let i = list.length - 1; i >= 0; i--) {
    if (now >= list[i].startMin) return { ...list[i], index: i }
  }
  return null
})
const nextTimelineSlot = computed(() => {
  const cur = currentTimelineSlot.value
  const list = timelineSlots.value
  if (!cur || cur.index >= list.length - 1) return null
  return list[cur.index + 1]
})
const minutesUntilNext = computed(() => {
  const next = nextTimelineSlot.value
  if (!next) return 0
  return Math.max(0, next.startMin - nowMinutes.value)
})

// v4: 学校作业进度
const homeworkDoneCount = computed(() => store.todayHomework.filter((t) => t.done).length)
const homeworkProgressPct = computed(() => {
  if (!store.todayHomework.length) return 0
  return Math.round((homeworkDoneCount.value / store.todayHomework.length) * 100)
})

// v4: 拓展任务进度
const expansionDoneCount = computed(() => store.todayTasks.filter((t) => isDone(t)).length)
const expansionProgressPct = computed(() => {
  if (!store.todayTasks.length) return 0
  return Math.round((expansionDoneCount.value / store.todayTasks.length) * 100)
})

// 最近 10 条打卡记录（checkins 按 createdAt 倒序）
const recentCheckins = computed(() =>
  [...store.checkins]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 10)
)

// ---- emoji 映射（按名称/分类关键词，未匹配用 ⭐）----
const EMOJI_RULES = [
  [/卡丁车/, '🏎️'],
  [/诗歌/, '🎵'],
  [/国象/, '♟️'],
  [/编程/, '💻'],
  [/乐高/, '🧱'],
  [/写字|练字/, '✏️'],
  [/思维/, '🧠'],
  [/英语/, '🔤'],
  [/语文/, '📖'],
  [/阅读/, '📚'],
  [/游戏/, '🎮'],
  [/体能|体育/, '💪'],
  [/实验/, '🔬'],
  [/拨付/, '💰'],
  [/评分|评价/, '📝']
]
function emojiForName(name = '') {
  for (const [re, e] of EMOJI_RULES) {
    if (re.test(name)) return e
  }
  return '⭐'
}
function emojiForTask(task) {
  return emojiForName(`${task.category || ''} ${task.name || ''}`)
}

// ---- 是否已打卡 ----
function isDone(task) {
  return store.todayTaskDoneIds.has(task.id)
}

// ---- 时段状态：past / current / future（用于高亮与置灰）----
function parseHHmm(s) {
  const [h, m] = s.trim().split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
function slotState(timeSlot) {
  const now = nowMinutes.value
  if (!timeSlot) return 'future'
  if (timeSlot === '早晨') return now < 8 * 60 ? 'current' : 'past' // 早晨视为 08:00 前
  const parts = timeSlot.split('-')
  const start = parseHHmm(parts[0])
  if (now < start) return 'future'
  const endPart = parts[1] && parts[1].trim()
  if (!endPart) return 'current' // 开放式结束（如 21:00-）视为当前
  return now <= parseHHmm(endPart) ? 'current' : 'past'
}
function slotLabel(timeSlot) {
  if (!timeSlot) return ''
  if (timeSlot === '早晨') return '早晨'
  return timeSlot.split('-')[0].trim()
}
function slotIcon(timeSlot) {
  return timeSlot === '早晨' ? '🌅' : '⏰'
}
function cardClass(task) {
  if (isDone(task)) return 'is-done'
  const st = slotState(task.timeSlot)
  if (st === 'current') return 'is-current'
  if (st === 'past') return 'is-past'
  return ''
}
function entryStyle(i) {
  return { animation: `tt-in 420ms ${i * 70}ms cubic-bezier(0.34,1.56,0.64,1) both` }
}

// ---- 打卡交互 ----
function setBusy(key, on) {
  const next = new Set(busy.value)
  if (on) next.add(key)
  else next.delete(key)
  busy.value = next
}
function tapTask(task) {
  if (isDone(task) || busy.value.has(task.id)) return
  setBusy(task.id, true)
  setTimeout(() => setBusy(task.id, false), 3000)
  confirmTask.value = task
}
function onCancel() {
  if (confirmTask.value) setBusy(confirmTask.value.id, false)
  confirmTask.value = null
}

// v4: 全勤检测
function checkAllDone() {
  if (_allDoneFired) return
  const hwAllDone = store.todayHomework.length > 0 && store.todayHomework.every((t) => t.done)
  const expAllDone = store.todayTasks.length > 0 && store.todayTasks.every((t) => isDone(t))
  // 至少有一区有任务且全部完成
  if ((hwAllDone || expAllDone) && (store.todayHomework.length + store.todayTasks.length > 0)) {
    _allDoneFired = true
    const msg = speakAllDone()
    bubbleText.value = msg
    bubbleEmoji.value = '🏆'
    bubbleTrigger.value++
    setTimeout(() => { showAllDone.value = true }, 600)
  }
}

// v4: 打卡学校作业
async function tapHomework(task) {
  if (task.done || busy.value.has(task.key)) return
  setBusy(task.key, true)
  setTimeout(() => setBusy(task.key, false), 3000)
  try {
    unlockAudio()
    const res = await store.addHomeworkCheckin(task)
    if (res) {
      playCoin().catch(() => {})
      // 语音鼓励 + 气泡
      warmUpVoice()
      const msg = speakEncouragement()
      bubbleText.value = msg
      bubbleEmoji.value = '⭐'
      bubbleTrigger.value++
      // 全勤检测
      checkAllDone()
    }
  } catch (e) {
    console.warn('[kid] homework checkin failed:', e)
  }
}

// ---- 临时补录（儿童端自助补录当天未提前录入的内容） ----
const tempHw = ref({ show: false, name: '', busy: false })
function openTempHw() {
  tempHw.value = { show: true, name: '', busy: false }
}
function cancelTempHw() {
  if (!tempHw.value.busy) tempHw.value.show = false
}
async function confirmTempHw() {
  const name = (tempHw.value.name || '').trim()
  if (!name || tempHw.value.busy) return
  tempHw.value.busy = true
  try {
    const res = await store.addTempHomework(name)
    if (res) {
      tempHw.value.show = false
      unlockAudio()
      playCoin().catch(() => {})
      warmUpVoice()
      const msg = speakEncouragement()
      bubbleText.value = msg
      bubbleEmoji.value = '⭐'
      bubbleTrigger.value++
      checkAllDone()
    }
  } catch (e) {
    console.warn('[kid] temp homework failed:', e)
  } finally {
    tempHw.value.busy = false
  }
}

const TEMP_POINTS = [1, 2, 3, 5]
const tempTask = ref({ show: false, name: '', points: 1, busy: false })
function openTempTask() {
  tempTask.value = { show: true, name: '', points: 1, busy: false }
}
function cancelTempTask() {
  if (!tempTask.value.busy) tempTask.value.show = false
}
async function confirmTempTask() {
  const name = (tempTask.value.name || '').trim()
  if (!name || tempTask.value.busy) return
  tempTask.value.busy = true
  try {
    const res = await store.addTempTask(name, tempTask.value.points)
    if (res) {
      tempTask.value.show = false
      unlockAudio()
      playCoin().catch(() => {})
      floating.value = { taskId: res.dailyEntry.taskId, points: tempTask.value.points, nonce: Date.now() }
      warmUpVoice()
      const msg = speakEncouragement()
      bubbleText.value = msg
      bubbleEmoji.value = '🎉'
      bubbleTrigger.value++
      checkAllDone()
    }
  } catch (e) {
    console.warn('[kid] temp task failed:', e)
  } finally {
    tempTask.value.busy = false
  }
}

// ---- 临时删除（从今天去掉，打卡/积分回滚） ----
const removeTarget = ref(null) // { task, kind: 'hw'|'task' }
const removing = ref(false)
function askRemove(task, kind) {
  removeTarget.value = { task, kind }
  removing.value = false
}
function cancelRemove() {
  if (!removing.value) removeTarget.value = null
}
async function confirmRemove() {
  const target = removeTarget.value
  if (!target || removing.value) return
  removing.value = true
  let ok = false
  try {
    ok = target.kind === 'hw'
      ? await store.removeHomeworkToday(target.task)
      : await store.removeTaskToday(target.task)
  } catch (e) {
    console.warn('[kid] remove failed:', e)
  } finally {
    removeTarget.value = null
    removing.value = false
  }
  if (ok) {
    unlockAudio()
    bubbleText.value = '今天先跳过啦'
    bubbleEmoji.value = '🧽'
    bubbleTrigger.value++
    checkAllDone()
  }
}

async function onConfirm() {
  if (submitting.value) return
  const task = confirmTask.value
  confirmTask.value = null
  if (!task) return
  submitting.value = true
  try {
    unlockAudio() // 首次手势解锁 AudioContext（iOS/Safari 必需）
    const res = await store.addTaskCheckin(task)
    if (res) {
      playCoin().catch(() => {})
      const nonce = Date.now()
      floating.value = { taskId: task.id, points: task.points, nonce }
      setTimeout(() => {
        if (floating.value && floating.value.nonce === nonce) floating.value = null
      }, 900)
      // v4: 语音鼓励 + 气泡
      warmUpVoice()
      const msg = speakEncouragement()
      bubbleText.value = msg
      bubbleEmoji.value = '⭐'
      bubbleTrigger.value++
      // v4: 全勤检测
      checkAllDone()
    }
  } catch (e) {
    console.warn('[kid] task checkin failed:', e)
  } finally {
    submitting.value = false
  }
}

let _clockTimer = null
let _resizeHandler = null
onMounted(async () => {
  // 进入儿童端：隐藏家长端顶部导航（样式在 kid-style.css，通过 body class 作用域）
  document.body.classList.add('kid-mode')
  try {
    await store.load()
    await store.seedWeeklyTasksIfEmpty()
  } catch (e) {
    console.warn('[kid] load failed:', e)
  } finally {
    loading.value = false
  }
  _clockTimer = setInterval(() => { nowMinutes.value = nowToMinutes() }, 60_000)
  // 视口宽度监听（侧栏/底部tab 随窗口切换）
  _resizeHandler = () => { viewportW.value = window.innerWidth }
  window.addEventListener('resize', _resizeHandler)
})

onBeforeUnmount(() => {
  document.body.classList.remove('kid-mode')
  if (_clockTimer) clearInterval(_clockTimer)
  if (_resizeHandler) window.removeEventListener('resize', _resizeHandler)
})
</script>

<style scoped>
/* ============================================================
   V2 卡通冒险风 — 全局统一设计语言
   ============================================================ */
/* 设计稿终稿背景：白底 + 两层径向光斑 */
.tt-page { min-height:100vh;min-height:100dvh;background:radial-gradient(ellipse at 65% 40%,rgba(99,102,241,.06),transparent 70%),radial-gradient(ellipse at 30% 80%,rgba(168,85,247,.04),transparent 60%),#fff;font-family:'DM Sans',system-ui,-apple-system,sans-serif;color:#1a1a2e;user-select:none;-webkit-user-select:none }
/* 设计稿 media query：≤768px 手机隐藏侧栏布局影响（侧栏已由 isWide 控制），双栏纵排 */
@media (max-width:768px) { .tt-dual { flex-direction:column } }
.tt-page--sidebar { display:flex;flex-direction:row }
.tt-sidebar { flex:0 0 100px;background:linear-gradient(180deg,#4f46e5,#7c3aed);display:flex;flex-direction:column;align-items:center;padding:20px 0 12px;gap:2px;border-right:3px solid rgba(255,255,255,.1) }
.sb-avatar { text-align:center;padding:0 0 16px;border-bottom:2px solid rgba(255,255,255,.15);width:100%;margin-bottom:12px }
.sb-avatar img { width:56px;height:56px;border-radius:16px;object-fit:cover;border:2px solid rgba(255,255,255,.2);filter:drop-shadow(0 2px 8px rgba(0,0,0,.2)) }
.sb-avatar-emoji { font-size:44px;display:flex;align-items:center;justify-content:center }
.sb-avatar-level { display:block;font-size:13px;font-weight:900;color:rgba(255,255,255,.8);margin-top:6px;background:rgba(255,255,255,.15);padding:3px 12px;border-radius:99px }
.sb-item { display:flex;align-items:center;gap:8px;width:calc(100% - 12px);margin:0 6px;padding:12px 12px;border-radius:14px;border:none;background:transparent;color:rgba(255,255,255,.5);font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;text-align:left }
.sb-item:hover { background:rgba(255,255,255,.08);color:rgba(255,255,255,.8) }
.sb-item.is-active { color:#fff;font-weight:900;background:rgba(255,255,255,.15) }
.sb-item-icon { width:22px;height:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0 }
.sb-item-icon svg { width:100%;height:100%;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;fill:none }
.sb-spacer { flex:1 }
.sb-parent { color:rgba(255,255,255,.3);font-size:14px;justify-content:center }
/* tt-body 无规则时 flex-column 父容器下宽度按固有内容收缩(497px) → 显式拉满 */
.tt-body { width:100%;min-width:0 }
.tt-main-area { flex:1;display:flex;flex-direction:column;min-width:0;overflow-y:auto;padding:20px 24px;gap:16px }
/* ============================================================
   v4.1: 时间条
   ============================================================ */
.tt-time-bar { display:flex;justify-content:space-between;align-items:center;padding:12px 20px;background:rgba(255,255,255,.85);border-radius:16px;border:2px solid #e0e7ff;box-shadow:0 2px 8px rgba(79,70,229,.05);backdrop-filter:blur(8px) }
.tt-tb-left { display:flex;align-items:center;gap:10px;font-size:15px;font-weight:700;color:#1a1a2e }
.tt-tb-time { color:#4f46e5;font-size:18px;font-variant-numeric:tabular-nums }
.tt-tb-right { text-align:right;font-size:14px;color:#64748b }
.tt-tb-slot { color:#4f46e5;font-weight:800 }
.tt-tb-next { font-size:12px;color:#94a3b8;margin-top:2px }

/* ============================================================
   v4.1: XP 等级进度条
   ============================================================ */
.tt-xp-section { background:rgba(255,255,255,.85);border-radius:16px;padding:14px 20px;border:2px solid #e0e7ff;display:flex;flex-direction:column;gap:8px;backdrop-filter:blur(8px) }
.tt-xp-labels { display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#64748b }
.tt-xp-current { color:#4f46e5 }
.tt-xp-track { height:16px;background:#eef2ff;border-radius:99px;overflow:hidden }
.tt-xp-fill { height:100%;border-radius:99px;background:linear-gradient(90deg,#818cf8,#6366f1,#4f46e5);position:relative;transition:width .6s }
.tt-xp-fill::after { content:'';position:absolute;top:2px;left:8px;right:8px;height:4px;background:rgba(255,255,255,.3);border-radius:99px }

.tt-time-indicator { display:flex;justify-content:space-between;align-items:center;padding:12px 20px;background:rgba(255,255,255,.85);border-radius:16px;border:2px solid #e0e7ff;box-shadow:0 2px 8px rgba(79,70,229,.05);backdrop-filter:blur(8px) }
.tti-left { display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:#1a1a2e }
.tti-right { font-size:14px;color:#64748b }
.tti-right .tti-slot { color:#4f46e5;font-weight:800 }
.tti-done { color:#10b981;font-weight:700 }
.tt-today { display:flex;flex-direction:column;gap:16px }
.tt-dual { display:flex;gap:20px;flex:1 }
.tt-column { flex:1;display:flex;flex-direction:column;gap:12px;min-width:0 }
.tt-col-head { display:flex;align-items:center;justify-content:space-between }
.tt-col-head-left { display:flex;align-items:center;gap:10px }
.tt-col-head h2 { font-size:20px;font-weight:900;color:#1a1a2e;margin:0 }
.tt-col-icon { width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:8px;flex-shrink:0 }
.tt-col-icon svg { width:20px;height:20px;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;fill:none }
.tt-col-icon.is-school { background:#eef2ff;color:#6366f1 }
.tt-col-icon.is-school svg { stroke:#6366f1 }
.tt-col-icon.is-expand { background:#fef3c7;color:#d97706 }
.tt-col-icon.is-expand svg { stroke:#d97706 }
.tt-col-badge { font-size:12px;font-weight:800;padding:4px 12px;border-radius:99px }
.tt-col-badge.is-xp { color:#6366f1;background:#eef2ff }
.tt-col-badge.is-pts { color:#d97706;background:#fef3c7 }
.tt-col-empty { display:flex;flex-direction:column;align-items:center;gap:8px;padding:32px 16px;border-radius:20px;background:rgba(255,255,255,.5);border:2px dashed #e5e7eb }
.tt-col-empty-emoji { font-size:36px }
.tt-col-empty-text { font-size:18px;font-weight:600;color:#999 }
.tt-section-card { background:rgba(255,255,255,.85);border-radius:20px;padding:16px;border:2px solid #e0e7ff;display:flex;flex-direction:column;gap:10px;box-shadow:0 2px 12px rgba(79,70,229,.05);backdrop-filter:blur(8px) }
.tt-task { display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:16px;background:rgba(250,251,255,.8);border:2px solid #eef2ff;transition:all .15s;backdrop-filter:blur(4px) }
.tt-task:hover { border-color:#c7d2fe;transform:translateY(-2px);box-shadow:0 4px 12px rgba(79,70,229,.08) }
.tt-task.is-done { opacity:.5;border-color:#d1fae5;background:rgba(240,253,244,.8) }
.tt-task-emoji { font-size:28px;width:48px;height:48px;display:flex;align-items:center;justify-content:center;border-radius:14px;flex-shrink:0 }
.tt-task-emoji.is-school { background:#eef2ff;border:2px solid #c7d2fe }
.tt-task-emoji.is-expand { background:#fef3c7;border:2px solid #fde68a }
.tt-task-info { flex:1;min-width:0 }
.tt-task-name { font-size:16px;font-weight:700;color:#1a1a2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0 }
.tt-task-meta { font-size:12px;font-weight:700;color:#94a3b8;margin-top:2px }
.tt-task-meta .xp-tag { color:#6366f1 }
.tt-task-meta .pt-tag { color:#d97706 }
.tt-btn { padding:16px 28px;border-radius:20px;border:none;font-size:17px;font-weight:900;cursor:pointer;font-family:inherit;color:#fff;transition:all .2s cubic-bezier(.34,1.56,.64,1);position:relative;overflow:hidden;letter-spacing:.3px;display:inline-flex;align-items:center;gap:8px }
.tt-btn::before { content:'';position:absolute;top:0;left:0;right:0;height:50%;background:linear-gradient(180deg,rgba(255,255,255,.28),transparent);border-radius:20px 20px 0 0;pointer-events:none }
.tt-btn::after { content:'';position:absolute;bottom:0;left:0;right:0;height:30%;background:linear-gradient(0deg,rgba(0,0,0,.08),transparent);border-radius:0 0 20px 20px;pointer-events:none }
.tt-btn:active { transform:scale(.92) translateY(2px) }
.tt-btn-icon { width:22px;height:22px;flex-shrink:0;position:relative;z-index:1 }
.tt-btn-icon svg { width:100%;height:100%;stroke:currentColor;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;fill:none }
.tt-btn-label { position:relative;z-index:1 }
/* 注意：模板动态类是 is-go / is-done，选择器必须带 is- 前缀 */
.tt-btn.is-go { background:linear-gradient(180deg,rgba(129,140,248,.85),rgba(99,102,241,.9),rgba(79,70,229,.95));box-shadow:0 8px 28px rgba(99,102,241,.3),0 2px 4px rgba(0,0,0,.08);backdrop-filter:blur(8px) }
.tt-btn.is-go:hover { box-shadow:0 12px 36px rgba(99,102,241,.4);transform:scale(1.02) }
.tt-btn.is-done { background:linear-gradient(180deg,rgba(52,211,153,.85),rgba(16,185,129,.9),rgba(5,150,105,.95));box-shadow:0 8px 28px rgba(16,185,129,.3),0 2px 4px rgba(0,0,0,.08);backdrop-filter:blur(8px) }
.tt-progress { display:flex;align-items:center;gap:10px;padding:4px 0 }
.tt-progress-bar { flex:1;height:12px;background:#eef2ff;border-radius:99px;overflow:hidden }
.tt-progress-fill { height:100%;border-radius:99px;transition:width .4s }
.tt-progress-fill.is-xp { background:linear-gradient(90deg,#818cf8,#6366f1) }
.tt-progress-fill.is-pt { background:linear-gradient(90deg,#fbbf24,#f59e0b) }
.tt-progress-text { font-size:13px;font-weight:800;white-space:nowrap }
.tt-progress-text.is-xp { color:#6366f1 }
.tt-progress-text.is-pt { color:#d97706 }
.tt-badges { display:flex;gap:6px;flex-wrap:wrap }
.tt-badge { width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;background:rgba(241,245,249,.8);border:2px solid #e2e8f0 }
.tt-badge.is-locked { opacity:.2;filter:grayscale(1) }
.tt-loading { text-align:center;font-size:56px;padding:48px 0;animation:tt-flicker 1.2s ease-in-out infinite }
@keyframes tt-flicker { 0%,100%{opacity:1} 50%{opacity:.4} }
.tt-empty { display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 24px;border-radius:32px;background:rgba(255,255,255,.7);border:3px dashed #c7d2fe;text-align:center }
.tt-empty-emoji { font-size:72px;line-height:1 }
.tt-empty-title { font-size:28px;font-weight:800;color:#222 }
.tt-empty-hint { font-size:21px;font-weight:600;color:#6a6a6a }
.tt-score-card { background:linear-gradient(135deg,#6366f1,#4f46e5);border-radius:20px;padding:24px;color:#fff;display:flex;align-items:center;justify-content:space-between;box-shadow:0 8px 24px rgba(99,102,241,.3) }
.tt-score-label { font-size:18px;font-weight:700;opacity:.8 }
.tt-score-num { font-size:56px;font-weight:900;font-variant-numeric:tabular-nums;text-shadow:0 2px 8px rgba(0,0,0,.2) }
.tt-stats { display:flex;gap:12px }
.tt-stat { flex:1;background:rgba(255,255,255,.85);border-radius:16px;padding:16px;border:2px solid #e0e7ff;text-align:center;backdrop-filter:blur(8px) }
.tt-stat-icon { font-size:24px }
.tt-stat-num { display:block;font-size:24px;font-weight:900;color:#4f46e5;margin:4px 0 }
.tt-stat-label { font-size:13px;font-weight:600;color:#64748b }
.tt-mall { display:flex;flex-direction:column;gap:16px }
.tt-mall-header { display:flex;align-items:center;justify-content:space-between }
.tt-mall-balance { font-size:20px;font-weight:800;color:#fff;padding:6px 16px;border-radius:99px;background:linear-gradient(135deg,#6366f1,#4f46e5);box-shadow:0 4px 12px rgba(99,102,241,.3) }
.tt-mall-list { display:flex;flex-direction:column;gap:12px }
.tt-mall-card { display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:20px;background:rgba(255,255,255,.85);border:2px solid #e0e7ff;box-shadow:0 2px 12px rgba(79,70,229,.05);backdrop-filter:blur(8px);cursor:pointer;transition:all .15s }
.tt-mall-card:active { transform:scale(.97) }
.tt-mall-emoji { font-size:36px }
.tt-mall-info { flex:1 }
.tt-mall-name { font-size:20px;font-weight:700;color:#1a1a2e }
.tt-mall-cost { font-size:16px;font-weight:600;color:#64748b }
.tt-mall-yes { font-size:16px;font-weight:700;color:#10b981 }
.tt-mall-no { font-size:16px;font-weight:700;color:#d97706 }
.tt-mall-wish { width:100%;padding:14px;border-radius:16px;border:2px dashed #c7d2fe;background:transparent;font-size:18px;font-weight:700;color:#6366f1;cursor:pointer;font-family:inherit }
.tt-mall-wish:active { background:rgba(99,102,241,.05) }
.tt-wish-form { display:flex;gap:8px }
.tt-wish-input { flex:1;padding:12px 16px;border-radius:12px;border:2px solid #c7d2fe;font-size:18px;font-weight:600;outline:none;background:rgba(255,255,255,.85);backdrop-filter:blur(8px) }
.tt-wish-input:focus { border-color:#6366f1 }
.tt-wish-btn { padding:12px 24px;border-radius:12px;border:none;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font-size:18px;font-weight:800;cursor:pointer;font-family:inherit }
.tt-wish-btn:disabled { opacity:.4 }
.tt-wish-msg { text-align:center;font-size:16px;font-weight:700 }
.tt-wish-msg.is-ok { color:#10b981 }
.tt-wish-msg.is-err { color:#dc2626 }
.tt-settings-page { display:flex;flex-direction:column;gap:16px }
.tt-timeline { display:flex;flex-direction:column;gap:12px }
.tt-tl-list { display:flex;flex-direction:column;gap:0 }
.tt-tl-slot { display:flex;align-items:stretch;gap:12px;min-height:48px }
.tt-tl-time { flex:0 0 70px;display:flex;align-items:center;gap:6px;padding:8px 0;font-size:15px;font-weight:700;color:#64748b;font-variant-numeric:tabular-nums }
.tt-tl-line { flex:0 0 3px;background:#e5e7eb;border-radius:2px;margin:4px 0 }
.tt-tl-content { flex:1;display:flex;align-items:center;padding:8px 14px;font-size:17px;font-weight:600;color:#475569;border-radius:12px;transition:background .3s }
.tt-tl-slot.is-current .tt-tl-line { background:linear-gradient(180deg,#6366f1,#4f46e5);box-shadow:0 0 8px rgba(99,102,241,.4) }
.tt-tl-slot.is-current .tt-tl-content { background:rgba(99,102,241,.06);border-left:3px solid #6366f1;font-weight:800;color:#1a1a2e }
.tt-tl-slot.is-past .tt-tl-time { color:#cbd5e1 }
.tt-tl-slot.is-past .tt-tl-content { color:#cbd5e1 }
.tt-settings { margin-top:24px;text-align:center }
.tt-settings-link { display:inline-block;padding:12px 32px;border-radius:16px;background:rgba(255,255,255,.7);color:#64748b;font-size:18px;font-weight:700;text-decoration:none;border:2px solid #e0e7ff;transition:background .15s }
.tt-settings-link:active { background:#e0e7ff }
.tt-confirm-overlay { position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.4);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center }
.tt-confirm-card { background:rgba(255,255,255,.95);border-radius:28px;padding:32px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.2);backdrop-filter:blur(12px);min-width:280px }
.tt-confirm-emoji { font-size:56px;margin-bottom:8px }
.tt-confirm-name { font-size:22px;font-weight:800;color:#1a1a2e;margin-bottom:4px }
.tt-confirm-points { font-size:28px;font-weight:900;color:#4f46e5;margin-bottom:16px }
.tt-confirm-yes,.tt-confirm-no { display:block;width:100%;padding:14px;border-radius:16px;border:none;font-size:18px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:8px }
.tt-confirm-yes { background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;box-shadow:0 4px 12px rgba(99,102,241,.3) }
.tt-confirm-no { background:rgba(241,245,249,.8);color:#64748b }
.tt-confirm-yes:disabled { opacity:.5 }
/* 临时补录按钮/输入/积分档位 */
.tt-temp-add { display:block; width:100%; margin-top:10px; padding:12px; border:2px dashed #c7d2fe; border-radius:16px; background:rgba(238,242,255,.5); color:#6366f1; font-size:15px; font-weight:800; cursor:pointer; font-family:inherit }
.tt-temp-add:active { transform:scale(.97) }
.tt-temp-input { display:block; width:100%; box-sizing:border-box; padding:14px; margin-bottom:12px; border:2px solid #e0e7ff; border-radius:16px; font-size:18px; font-weight:700; text-align:center; font-family:inherit; outline:none; background:#fff; color:#1a1a2e }
.tt-temp-input:focus { border-color:#818cf8 }
.tt-pts-chips { display:flex; gap:8px; justify-content:center; margin-bottom:8px }
.tt-pts-chip { padding:10px 18px; border-radius:999px; border:2px solid #e0e7ff; background:#fff; color:#6366f1; font-size:16px; font-weight:800; cursor:pointer; font-family:inherit }
.tt-pts-chip.is-on { background:linear-gradient(135deg,#6366f1,#4f46e5); color:#fff; border-color:#4f46e5; box-shadow:0 4px 12px rgba(99,102,241,.3) }
/* 临时删除（卡片左上角✕，避开右侧闯关按钮） */
.tt-task { position:relative }
.tt-card-x { position:absolute; top:5px; left:6px; width:24px; height:24px; border-radius:50%; border:1.5px solid #fecaca; background:rgba(254,226,226,.95); color:#ef4444; font-size:12px; font-weight:800; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; z-index:2 }
.tt-card-x:active { transform:scale(.9) }
/* 角色壁纸（三件套）：半透明垫底，主内容 z-index 压上去 */
.tt-wall { position:fixed; inset:0; z-index:0; background-position:center; background-size:cover; background-repeat:no-repeat; opacity:.14; pointer-events:none }
.tt-main-area { position:relative; z-index:1 }
/* 变身 GIF（横版素材，深底卡片居中） */
.tt-morph-gif { display:block; width:min(72vw,540px); max-height:52vh; border-radius:20px; background:#0a0a1a; margin:0 auto 12px }
.tt-tabs { display:flex;background:rgba(255,255,255,.9);border-top:1px solid #e0e7ff;padding:8px 0;backdrop-filter:blur(8px) }
.tt-tab { flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border:none;background:transparent;color:#94a3b8;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:color .15s }
.tt-tab.is-active { color:#4f46e5;font-weight:800 }
.tt-float-points { position:absolute;top:-10px;right:16px;font-size:18px;font-weight:900;color:#10b981;animation:tt-float .9s ease-out forwards;pointer-events:none }
@keyframes tt-float { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-30px)} }
.tt-float-enter-active { animation:tt-float .9s ease-out }
.tt-float-leave-active { display:none }
.tt-pop-enter-active { animation:tt-pop-in .3s cubic-bezier(.34,1.56,.64,1) }
.tt-pop-leave-active { animation:tt-pop-out .2s ease-in }
@keyframes tt-pop-in { 0%{opacity:0;transform:scale(.8)} 100%{opacity:1;transform:scale(1)} }
@keyframes tt-pop-out { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(.9)} }
.tt-records { background:rgba(255,255,255,.85);border-radius:16px;padding:16px;border:2px solid #e0e7ff;backdrop-filter:blur(8px) }
.tt-records-title { font-size:16px;font-weight:800;color:#4f46e5;margin-bottom:8px }
.tt-records-empty { font-size:14px;color:#94a3b8;text-align:center;padding:12px }
.tt-record { display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(241,245,249,.8);font-size:14px }
.tt-record:last-child { border:none }
.tt-record-emoji { font-size:20px }
.tt-record-mid { flex:1 }
.tt-record-name { font-weight:600;color:#1a1a2e }
.tt-record-date { font-size:12px;color:#94a3b8;margin-left:6px }
.tt-record-points { font-weight:800;color:#4f46e5 }
.tt-record-points.is-neg { color:#dc2626 }
@media(min-width:640px){.tt-score-num{font-size:88px}}

/* ============================================================
   Phase 4: 变身动画占位（TODO: QC提供变身GIF后替换）
   ============================================================ */
.tt-morph-overlay {
  position: fixed; inset: 0; z-index: 99999;
  background: rgba(0,0,0,.6); backdrop-filter: blur(12px);
  display: flex; align-items: center; justify-content: center;
  animation: tt-morph-fade-in .3s ease-out;
}
.tt-morph-card {
  text-align: center;
  animation: tt-morph-pulse 1s ease-in-out infinite;
}
.tt-morph-emoji {
  font-size: 96px; line-height: 1;
  filter: drop-shadow(0 4px 24px rgba(251,191,36,.6));
}
.tt-morph-text {
  margin-top: 16px; font-size: 32px; font-weight: 900; color: #fff;
  text-shadow: 0 2px 12px rgba(0,0,0,.4);
}
.tt-morph-hint {
  margin-top: 12px; font-size: 14px; color: rgba(255,255,255,.5);
}
@keyframes tt-morph-fade-in { 0%{opacity:0} 100%{opacity:1} }
@keyframes tt-morph-pulse {
  0%,100%{transform:scale(1)}
  50%{transform:scale(1.15)}
}

/* ============================================================
   Phase 4: 导入本周时间表按钮
   ============================================================ */
.btn-import {
  margin-top: 12px; padding: 12px; border-radius: 14px;
  border: 2px dashed #c7d2fe; background: rgba(250,245,255,.8);
  color: #6366f1; font-size: 15px; font-weight: 700;
  cursor: pointer; font-family: inherit; width: 100%;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: background .15s;
}
.btn-import:hover { background: #eef2ff; }

/* ============================================================
   Phase 4: V2 商城卡片 — 玻璃效果 + hover 上浮
   ============================================================ */
.tt-mall-card {
  transition: all .2s cubic-bezier(.34,1.56,.64,1);
}
.tt-mall-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(79,70,229,.12);
  border-color: #c7d2fe;
}
/* 兑换按钮：半透明软糖渐变（.btn-go 同款） */
.tt-mall-yes {
  display: inline-block; padding: 6px 16px; border-radius: 12px;
  background: linear-gradient(135deg,rgba(52,211,153,.85),rgba(16,185,129,.9));
  color: #fff; font-size: 14px; font-weight: 800;
  box-shadow: 0 4px 12px rgba(16,185,129,.25);
}

/* ============================================================
   Phase 4: 成就墙 — 玻璃底 + 锁定态降饱和 + hover 放大
   ============================================================ */
.tt-achieve {
  background: rgba(255,255,255,.85); border-radius: 16px; padding: 16px;
  border: 2px solid #e0e7ff; backdrop-filter: blur(8px);
}
.tt-achieve-head {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
}
.tt-achieve-count { font-size: 14px; font-weight: 800; color: #6366f1; }
.tt-achieve-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 10px;
}
.tt-achieve-badge {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 4px; border-radius: 14px;
  background: rgba(255,255,255,.7); border: 2px solid #eef2ff;
  cursor: pointer; transition: all .2s;
}
.tt-achieve-badge:hover { transform: scale(1.08); box-shadow: 0 4px 12px rgba(79,70,229,.1); }
.tt-achieve-badge.is-locked {
  opacity: .45; filter: grayscale(.6) saturate(.4);
  pointer-events: auto; /* still clickable to show desc */
}
.tt-achieve-emoji { font-size: 28px; }
.tt-achieve-name { font-size: 11px; font-weight: 700; color: #475569; text-align: center; line-height: 1.2; }

/* ============================================================
   Phase 4: 设置页 — settings-card 风格 + 时间行高亮
   ============================================================ */
.tt-settings-card {
  background: rgba(255,255,255,.85); border-radius: 16px; padding: 16px;
  border: 2px solid #e0e7ff; box-shadow: 0 2px 8px rgba(79,70,229,.04);
  backdrop-filter: blur(8px);
}
/* 设计稿 settings-card 标题：靛蓝 + 时钟SVG图标 */
.tt-settings-title { font-size:15px;font-weight:800;color:#4f46e5;margin-bottom:10px;display:flex;align-items:center;gap:8px }
.tt-settings-ico { width:22px;height:22px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center }
.tt-settings-ico svg { width:100%;height:100%;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;fill:none }
/* 时间线"当前"标记 */
.tt-tl-now { color:#059669;font-weight:800;font-size:13px }
.tt-tl-slot.is-current .tt-tl-content {
  background: rgba(5,150,105,.06);
  border-left: 3px solid #059669;
  color: #059669; font-weight: 800;
}
.tt-tl-slot.is-current .tt-tl-line {
  background: linear-gradient(180deg,#059669,#10b981);
  box-shadow: 0 0 8px rgba(5,150,105,.4);
}

/* ============================================================
   Phase 4: 底部/侧栏 tab 激活态 — 白字 + 半透明背景
   ============================================================ */
.tt-tab.is-active {
  color: #fff; font-weight: 800;
  background: rgba(255,255,255,.15); border-radius: 12px;
}
</style>
