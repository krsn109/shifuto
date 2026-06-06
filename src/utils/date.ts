export function getJSTDate() {
    // Create a date object with the current time
    const date = new Date()

    // Convert to JST (UTC+9)
    // This handles the offset manually to ensure consistency regardless of server timezone
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000)
    const jstOffset = 9 * 60 * 60 * 1000
    return new Date(utc + jstOffset)
}

export function getCurrentSubmissionPeriod() {
    const now = getJSTDate()
    const day = now.getDate()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-indexed

    let targetStart: Date
    let targetEnd: Date

    if (day >= 2 && day <= 15) {
        // Rule 2: Submit between 2nd and 15th
        // Target: This month 26th to Next month 10th
        targetStart = new Date(year, month, 26)
        targetEnd = new Date(year, month + 1, 10)
    } else {
        // Rule 1: Submit between 16th and 1st (of next month)

        if (day === 1) {
            // If today is 1st, we are at the end of the submission period started last month
            // Target: This month 11th to This month 25th
            targetStart = new Date(year, month, 11)
            targetEnd = new Date(year, month, 25)
        } else {
            // If today is 16th or later
            // Target: Next month 11th to Next month 25th
            targetStart = new Date(year, month + 1, 11)
            targetEnd = new Date(year, month + 1, 25)
        }
    }

    // Set times to start/end of day
    targetStart.setHours(0, 0, 0, 0)
    targetEnd.setHours(23, 59, 59, 999)

    return { targetStart, targetEnd }
}

export function formatDate(d: Date) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export function isDateInPeriod(date: Date | string, start: Date | string, end: Date | string) {
    // Compare using YYYY-MM-DD strings to avoid time/timezone issues
    const toStr = (d: Date | string) => {
        if (typeof d === 'string') return d
        return formatDate(d)
    }

    const d = toStr(date)
    const s = toStr(start)
    const e = toStr(end)

    return d >= s && d <= e
}

export function getCurrentShiftPeriod(latestAssignmentDate?: Date) {
    const now = getJSTDate()
    const day = now.getDate()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-indexed

    let start: Date
    let end: Date

    // Default logic
    if (day >= 2 && day <= 15) {
        start = new Date(year, month, 11)
        end = new Date(year, month, 25)
    } else {
        if (day >= 16) {
            start = new Date(year, month, 26)
            end = new Date(year, month + 1, 10)
        } else {
            start = new Date(year, month - 1, 26)
            end = new Date(year, month, 10)
        }
    }

    // If we have a latest assignment date that is AFTER the default end date,
    // it means the admin has confirmed a future shift. We should show that period.
    if (latestAssignmentDate && latestAssignmentDate > end) {
        // Determine the period for this future date
        const lDay = latestAssignmentDate.getDate()
        const lYear = latestAssignmentDate.getFullYear()
        const lMonth = latestAssignmentDate.getMonth()

        if (lDay >= 11 && lDay <= 25) {
            // It's an 11-25 period
            start = new Date(lYear, lMonth, 11)
            end = new Date(lYear, lMonth, 25)
        } else {
            // It's a 26-10 period
            if (lDay >= 26) {
                start = new Date(lYear, lMonth, 26)
                end = new Date(lYear, lMonth + 1, 10)
            } else {
                // 1-10
                start = new Date(lYear, lMonth - 1, 26)
                end = new Date(lYear, lMonth, 10)
            }
        }
    }

    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    return { start, end }
}
