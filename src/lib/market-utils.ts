export const getPrePostLabel = (updatedAtStr?: string) => {
  if (!updatedAtStr) return { isPre: false, label: "post/หลัง :", colorClass: "text-blue-400" };
  try {
    const date = new Date(updatedAtStr);
    const utcHour = date.getUTCHours();
    const utcDay = date.getUTCDay(); // 0 is Sunday, 6 is Saturday
    
    // US Market is closed on weekends. Any extended quote updated on Sat/Sun
    // is the post-market price from Friday.
    if (utcDay === 0 || utcDay === 6) {
      return { isPre: false, label: "post/หลัง :", colorClass: "text-blue-400" };
    }
    
    // US Market opens at 13:30 or 14:30 UTC. If it's before 16:00 UTC, it's morning in NY.
    if (utcHour < 16) {
      return { isPre: true, label: "pre/ก่อน :", colorClass: "text-yellow-400" };
    }
  } catch (e) {
    // fallback
  }
  return { isPre: false, label: "post/หลัง :", colorClass: "text-blue-400" };
};
