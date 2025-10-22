class TimelineBuilder {
  constructor(process) {
    this.process = process;
  }

  build() {
    const timeline = this.process.raw?.timeline;
    if (!timeline) return null;

    return {
      typicalDurationDays: timeline.typical_duration_days || null,
      slaDurationDays: timeline.sla_duration_days || null,
      milestones: Array.isArray(timeline.critical_milestones) ? timeline.critical_milestones : []
    };
  }
}

module.exports = { TimelineBuilder };
