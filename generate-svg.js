import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), './data/data.json');

if (!fs.existsSync(filePath)) {
    console.error("Error: ./data/data.json missing.");
    process.exit(1);
}

const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const aggregateLanguages = (data) => {
    const langMap = {};

    const repoNodes = Array.isArray(data.repositories) ? data.repositories : (data.repositories?.nodes || []);

    repoNodes.forEach(repo => {
        if (repo.languages && repo.languages.edges) {
            repo.languages.edges.forEach(edge => {
                const langName = edge.node.name;
                const langColor = edge.node.color || '#cccccc';
                const size = edge.size;
                if (!langMap[langName]) {
                    langMap[langName] = { name: langName, color: langColor, size: 0 };
                }
                langMap[langName].size += size;
            });
        }
    });

    return Object.values(langMap)
        .sort((a, b) => b.size - a.size)
        .slice(0,10);
};

const extractCalendarWeeks = (data) => {
    return data.profile?.user?.contributionsCollection?.contributionCalendar?.weeks || [];
};

const generateLanguageSvg = (topLangs) => {
    const totalSize = topLangs.reduce((sum, l) => sum + l.size, 0);

    if (totalSize === 0 || topLangs.length === 0) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="110" viewBox="0 0 500 110">
    <style>
        .title { font: bold 14px 'Segoe UI', sans-serif; fill: #24292e; }
        .empty-text { font: 12px 'Segoe UI', sans-serif; fill: #8b949e; }
    </style>
    <rect width="100%" height="100%" fill="#ffffff" rx="8" stroke="#e1e4e8" stroke-width="1"/>
    <text x="20" y="30" class="title">Top Languages</text>
    <text x="20" y="70" class="empty-text">No repository language data found in data.json</text>
</svg>`;
    }

    const availableWidth = 460;
    const gapWidth = 2;
    const totalGaps = (topLangs.length - 1) * gapWidth;
    const netWidth = availableWidth - totalGaps;

    let currentX = 20;
    const bars = topLangs.map(lang => {
        const width = (lang.size / totalSize) * netWidth;
        const barStr = `<rect x="${currentX}" y="50" width="${width}" height="12" fill="${lang.color}" rx="3"/>`;
        currentX += width + gapWidth;
        return barStr;
    }).join('\n');

    let labels = '';
    let currentLabelX = 20;
    let currentLabelY = 85;
    const maxRowWidth = 460;
    const rowHeight = 25;

    topLangs.forEach((lang) => {
        const percentage = ((lang.size / totalSize) * 100).toFixed(1);
        const textContent = `${lang.name} ${percentage}%`;

        const estimatedItemWidth = (textContent.length * 7) + 25;

        if (currentLabelX + estimatedItemWidth > maxRowWidth && currentLabelX > 20) {
            currentLabelX = 20;
            currentLabelY += rowHeight;
        }

        labels += `
            <circle cx="${currentLabelX + 5}" cy="${currentLabelY}" r="5" fill="${lang.color}"/>
            <text x="${currentLabelX + 18}" y="${currentLabelY + 4}" font-family="Segoe UI, sans-serif" font-size="12" fill="#586069">${textContent}</text>\n`;

        currentLabelX += estimatedItemWidth + 30;
    });

    const canvasHeight = currentLabelY + 30;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="${canvasHeight}" viewBox="0 0 500 ${canvasHeight}">
    <style>
        .title { font: bold 14px 'Segoe UI', sans-serif; fill: #24292e; }
    </style>
    <rect width="100%" height="100%" fill="#ffffff" rx="8" stroke="#e1e4e8" stroke-width="1"/>
    <text x="20" y="30" class="title">Top Languages</text>
    ${bars}
    ${labels}
</svg>`;
};

const generateHeatmapSvg = (weeks) => {
    let rects = '';
    const colorMap = {
        'NONE': '#ebedf0',
        'FIRST_QUARTILE': '#9be9a8',
        'SECOND_QUARTILE': '#40c463',
        'THIRD_QUARTILE': '#30a14e',
        'FOURTH_QUARTILE': '#216e39'
    };

    weeks.forEach((week, colIndex) => {
        if (!week.contributionDays) return;
        week.contributionDays.forEach((day, rowIndex) => {
            const x = colIndex * 14 + 20;
            const y = rowIndex * 14 + 50;
            const fillColor = colorMap[day.contributionLevel] || '#ebedf0';
            rects += `<rect x="${x}" y="${y}" width="11" height="11" fill="${fillColor}" rx="2">
                <title>${day.contributionCount} commits on ${day.date}</title>
            </rect>\n`;
        });
    });

    const totalContributions = rawData.profile?.user?.contributionsCollection?.contributionCalendar?.totalContributions || 0;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="780" height="170" viewBox="0 0 780 170">
    <style>
        .title { font: bold 14px 'Segoe UI', sans-serif; fill: #24292e; }
        .subtitle { font: 12px 'Segoe UI', sans-serif; fill: #586069; }
    </style>
    <rect width="100%" height="100%" fill="#ffffff" rx="8" stroke="#e1e4e8" stroke-width="1"/>
    <text x="20" y="30" class="title">Contribution Graph</text>
    <text x="630" y="30" class="subtitle">Total: ${totalContributions} Commits</text>
    <g>
        ${rects}
    </g>
</svg>`;
};

const generateStatsSvg = (data) => {
    const user = data.profile?.user || {};
    const contributions = user.contributionsCollection || {};
    const calendar = contributions.contributionCalendar || {};

    const name = user.name || user.login || "Suresh Dahal";
    const commits = calendar.totalContributions || contributions.totalCommitContributions || 0;
    const prs = contributions.totalPullRequestContributions || 0;
    const issues = contributions.totalIssueContributions || 0;

    const repoNodes = Array.isArray(data.repositories) ? data.repositories : (data.repositories?.nodes || []);
    let totalStars = 0;
    let totalForks = 0;
    repoNodes.forEach(repo => {
        totalStars += repo.stargazerCount || 0;
        totalForks += repo.forkCount || 0;
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="195" viewBox="0 0 300 195">
    <style>
        .title { font: bold 14px 'Segoe UI', sans-serif; fill: #24292e; }
        .stat-label { font: 13px 'Segoe UI', sans-serif; fill: #586069; }
        .stat-val { font: bold 13px 'Segoe UI', sans-serif; fill: #24292e; }
    </style>
    <rect width="100%" height="100%" fill="#ffffff" rx="8" stroke="#e1e4e8" stroke-width="1"/>
    <text x="20" y="30" class="title">${name}'s GitHub Stats</text>
    
    <text x="20" y="65" class="stat-label">Total Commits:</text>
    <text x="140" y="65" class="stat-val">${commits}</text>

    <text x="20" y="90" class="stat-label">Total PRs:</text>
    <text x="140" y="90" class="stat-val">${prs}</text>

    <text x="20" y="115" class="stat-label">Total Issues:</text>
    <text x="140" y="115" class="stat-val">${issues}</text>

    <text x="20" y="140" class="stat-label">Total Stars:</text>
    <text x="140" y="140" class="stat-val">${totalStars}</text>

    <text x="20" y="165" class="stat-label">Total Forks:</text>
    <text x="140" y="165" class="stat-val">${totalForks}</text>
</svg>`;
};

export const generateSvg = () => {
    const topLangs = aggregateLanguages(rawData);
    const langSvgContent = generateLanguageSvg(topLangs);

    const weeks = extractCalendarWeeks(rawData);
    const heatmapSvgContent = generateHeatmapSvg(weeks);

    const statsSvgContent = generateStatsSvg(rawData);

    const outputDir = path.join(process.cwd(), './data');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(path.join(outputDir, 'languages.svg'), langSvgContent);
    fs.writeFileSync(path.join(outputDir, 'heatmap.svg'), heatmapSvgContent);
    fs.writeFileSync(path.join(outputDir, 'stats.svg'), statsSvgContent);

};

