import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generate a professional PDF report from the report data.
 * Creates a multi-page PDF matching consultant-quality output.
 */
export const generatePDF = async (report, elementRef) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // Colors matching Clearance theme
  const colors = {
    primary: [13, 17, 23],      // #0D1117
    secondary: [22, 27, 34],    // #161B22
    text: [230, 237, 243],      // #E6EDF3
    muted: [139, 148, 158],     // #8B949E
    pass: [16, 185, 129],       // #10B981
    partial: [245, 158, 11],    // #F59E0B
    fail: [239, 68, 68],        // #EF4444
    accent: [59, 130, 246],     // #3B82F6
  };

  let currentY = margin;

  // Helper: Add new page if needed
  const checkNewPage = (requiredHeight) => {
    if (currentY + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  // Helper: Add page footer
  const addFooter = (pageNum, totalPages) => {
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.muted);
    pdf.text(`Clearance - DISP Compliance Assessment | Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    pdf.text(report.assessment_date?.split('T')[0] || new Date().toISOString().split('T')[0], pageWidth - margin, pageHeight - 8, { align: 'right' });
  };

  // ============================================
  // PAGE 1: COVER PAGE
  // ============================================
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Logo placeholder
  pdf.setFillColor(...colors.accent);
  pdf.circle(pageWidth / 2, 50, 15, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('C', pageWidth / 2, 55, { align: 'center' });

  // Title
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CLEARANCE', pageWidth / 2, 85, { align: 'center' });

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...colors.muted);
  pdf.text('DISP Compliance Assessment Report', pageWidth / 2, 95, { align: 'center' });

  // Company name
  pdf.setFontSize(24);
  pdf.setTextColor(...colors.text);
  pdf.setFont('helvetica', 'bold');
  pdf.text(report.company_name || 'Company Name', pageWidth / 2, 130, { align: 'center' });

  // Framework
  const frameworkName = report.framework === 'combined'
    ? 'DISP Entry Level + ASD Essential Eight'
    : report.framework === 'disp-entry-level'
      ? 'DISP Entry Level'
      : 'ASD Essential Eight ML2';

  pdf.setFontSize(14);
  pdf.setTextColor(...colors.muted);
  pdf.text(frameworkName, pageWidth / 2, 145, { align: 'center' });

  // Date
  const assessmentDate = report.assessment_date
    ? new Date(report.assessment_date).toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });

  pdf.setFontSize(12);
  pdf.text(assessmentDate, pageWidth / 2, 160, { align: 'center' });

  // Compliance Score
  pdf.setFontSize(48);
  const scoreColor = report.overall_score >= 70 ? colors.pass : report.overall_score >= 40 ? colors.partial : colors.fail;
  pdf.setTextColor(...scoreColor);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${report.overall_score || 0}%`, pageWidth / 2, 200, { align: 'center' });

  pdf.setFontSize(12);
  pdf.setTextColor(...colors.muted);
  pdf.text('Overall Compliance Score', pageWidth / 2, 210, { align: 'center' });

  // Confidential notice
  pdf.setFontSize(10);
  pdf.setTextColor(...colors.fail);
  pdf.text('CONFIDENTIAL', pageWidth / 2, pageHeight - 30, { align: 'center' });

  pdf.setTextColor(...colors.muted);
  pdf.setFontSize(8);
  pdf.text('This document contains sensitive security assessment information.', pageWidth / 2, pageHeight - 22, { align: 'center' });
  pdf.text('Distribution is restricted to authorised personnel only.', pageWidth / 2, pageHeight - 17, { align: 'center' });

  // ============================================
  // PAGE 2: TABLE OF CONTENTS
  // ============================================
  pdf.addPage();
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  currentY = margin;

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Table of Contents', margin, currentY + 10);
  currentY += 25;

  const tocItems = [
    { title: 'Executive Summary', page: 3 },
    { title: 'Domain Risk Overview', page: 3 },
    { title: 'Key Findings', page: 4 },
    { title: 'Detailed Findings by Domain', page: 5 },
    { title: 'Recommended Actions', page: 0 }, // Will calculate
    { title: 'Conclusion', page: 0 },
    { title: 'Appendix', page: 0 },
  ];

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  tocItems.forEach((item, index) => {
    pdf.setTextColor(0, 0, 0);
    pdf.text(item.title, margin, currentY);
    pdf.setTextColor(...colors.muted);
    const dots = '.'.repeat(80);
    const textWidth = pdf.getTextWidth(item.title);
    pdf.text(dots, margin + textWidth + 2, currentY);
    currentY += 8;
  });

  // ============================================
  // PAGE 3: EXECUTIVE SUMMARY
  // ============================================
  pdf.addPage();
  currentY = margin;

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Executive Summary', margin, currentY + 10);
  currentY += 25;

  // Summary text
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  const summaryText = report.executive_summary ||
    `This assessment evaluates ${report.company_name}'s compliance posture against the ${frameworkName} framework. ` +
    `The organisation achieved an overall compliance score of ${report.overall_score}%, indicating ${
      report.overall_score >= 70 ? 'strong alignment' : report.overall_score >= 40 ? 'partial alignment with significant gaps' : 'critical gaps requiring immediate attention'
    } with defence industry security requirements.`;

  const summaryLines = pdf.splitTextToSize(summaryText, contentWidth);
  pdf.text(summaryLines, margin, currentY);
  currentY += summaryLines.length * 6 + 10;

  // v2.0 Confidence Summary (if available)
  if (report.confidence_summary) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Assessment Confidence', margin, currentY);
    currentY += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    const confText = [
      `Average Confidence: ${Math.round(report.confidence_summary.average_confidence * 100)}%`,
      `Evidence Validation Rate: ${report.confidence_summary.evidence_validation_rate}%`,
      `High Confidence Findings: ${report.confidence_summary.high_confidence}`,
      `Findings Requiring Review: ${report.confidence_summary.needs_review}`,
    ];

    confText.forEach(line => {
      pdf.text(line, margin + 5, currentY);
      currentY += 5;
    });

    currentY += 5;
  }

  currentY += 5;

  // Domain Risk Overview
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Domain Risk Overview', margin, currentY);
  currentY += 12;

  // Domain table header
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, currentY, contentWidth, 8, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Domain', margin + 2, currentY + 5.5);
  pdf.text('Pass', margin + 90, currentY + 5.5);
  pdf.text('Partial', margin + 110, currentY + 5.5);
  pdf.text('Fail', margin + 135, currentY + 5.5);
  pdf.text('Risk', margin + 155, currentY + 5.5);
  currentY += 10;

  // Domain rows
  pdf.setFont('helvetica', 'normal');
  (report.domain_summary || []).forEach((domain, index) => {
    if (index % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, currentY - 2, contentWidth, 8, 'F');
    }

    pdf.setTextColor(0, 0, 0);
    pdf.text(domain.domain || 'Unknown', margin + 2, currentY + 4);

    pdf.setTextColor(...colors.pass);
    pdf.text(String(domain.passed || 0), margin + 90, currentY + 4);

    pdf.setTextColor(...colors.partial);
    pdf.text(String(domain.partial || 0), margin + 110, currentY + 4);

    pdf.setTextColor(...colors.fail);
    pdf.text(String(domain.fail || 0), margin + 135, currentY + 4);

    // Risk level
    const totalIssues = (domain.partial || 0) + (domain.fail || 0);
    const riskLevel = totalIssues > 5 ? 'High' : totalIssues > 2 ? 'Medium' : 'Low';
    const riskColor = riskLevel === 'High' ? colors.fail : riskLevel === 'Medium' ? colors.partial : colors.pass;
    pdf.setTextColor(...riskColor);
    pdf.text(riskLevel, margin + 155, currentY + 4);

    currentY += 8;
  });

  // ============================================
  // PAGE 4+: KEY FINDINGS (High Risk)
  // ============================================
  pdf.addPage();
  currentY = margin;

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Key Findings', margin, currentY + 10);
  currentY += 20;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('The following high-priority gaps require immediate attention:', margin, currentY);
  currentY += 12;

  const highRiskFindings = (report.findings || []).filter(f => f.risk_rating === 'high' && f.status !== 'pass');

  highRiskFindings.slice(0, 10).forEach((finding, index) => {
    checkNewPage(25);

    pdf.setFillColor(254, 242, 242);
    pdf.rect(margin, currentY, contentWidth, 20, 'F');
    pdf.setDrawColor(...colors.fail);
    pdf.rect(margin, currentY, contentWidth, 20, 'S');

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...colors.fail);
    pdf.text(`${finding.requirement_id} - HIGH RISK`, margin + 3, currentY + 6);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    const gapText = pdf.splitTextToSize(finding.gap_description || 'No description available', contentWidth - 6);
    pdf.text(gapText[0], margin + 3, currentY + 13);

    currentY += 25;
  });

  if (highRiskFindings.length === 0) {
    pdf.setTextColor(...colors.pass);
    pdf.text('No high-risk findings identified.', margin, currentY);
    currentY += 10;
  }

  // ============================================
  // DETAILED FINDINGS BY DOMAIN
  // ============================================
  pdf.addPage();
  currentY = margin;

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Detailed Findings', margin, currentY + 10);
  currentY += 25;

  // Group findings by domain
  const findingsByDomain = {};
  (report.findings || []).forEach(finding => {
    const domainCode = finding.requirement_id?.split('-')[1] || 'Unknown';
    const domainName = domainCode === 'SG' ? 'Security Governance' :
                       domainCode === 'PS' ? 'Personnel Security' :
                       domainCode === 'PH' ? 'Physical Security' :
                       domainCode === 'IC' ? 'Information & Cybersecurity' :
                       domainCode === 'AC' ? 'Application Control' :
                       domainCode === 'PA' ? 'Patch Applications' :
                       domainCode === 'MFA' ? 'Multi-Factor Authentication' :
                       domainCode === 'UAH' ? 'User Application Hardening' :
                       domainCode === 'RB' ? 'Restrict Admin Privileges' :
                       domainCode === 'PO' ? 'Patch Operating Systems' :
                       domainCode === 'ROM' ? 'Office Macro Settings' :
                       domainCode === 'RAP' ? 'Regular Backups' : 'Other';

    if (!findingsByDomain[domainName]) {
      findingsByDomain[domainName] = [];
    }
    findingsByDomain[domainName].push(finding);
  });

  Object.entries(findingsByDomain).forEach(([domainName, findings]) => {
    checkNewPage(30);

    // Domain header
    pdf.setFillColor(...colors.secondary);
    pdf.rect(margin, currentY, contentWidth, 10, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(domainName, margin + 3, currentY + 7);
    currentY += 15;

    findings.forEach(finding => {
      checkNewPage(40);

      // Status badge color
      const statusColor = finding.status === 'pass' ? colors.pass :
                          finding.status === 'partial' ? colors.partial : colors.fail;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(finding.requirement_id || 'N/A', margin, currentY);

      // Status badge
      pdf.setFillColor(...statusColor);
      pdf.roundedRect(margin + 35, currentY - 4, 18, 6, 1, 1, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.text(finding.status?.toUpperCase() || 'N/A', margin + 37, currentY);

      // Risk badge
      const riskColor = finding.risk_rating === 'high' ? colors.fail :
                        finding.risk_rating === 'medium' ? colors.partial : colors.pass;
      pdf.setFillColor(...riskColor);
      pdf.roundedRect(margin + 55, currentY - 4, 18, 6, 1, 1, 'F');
      pdf.text(finding.risk_rating?.toUpperCase() || 'N/A', margin + 57, currentY);

      currentY += 8;

      // Gap description
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const gapLines = pdf.splitTextToSize(`Gap: ${finding.gap_description || 'No description'}`, contentWidth);
      pdf.text(gapLines.slice(0, 3), margin, currentY);
      currentY += Math.min(gapLines.length, 3) * 4 + 3;

      // Evidence quote if available
      if (finding.evidence_quote) {
        pdf.setTextColor(...colors.muted);
        pdf.setFont('helvetica', 'italic');
        const evidenceLines = pdf.splitTextToSize(`"${finding.evidence_quote}"`, contentWidth - 10);
        pdf.text(evidenceLines.slice(0, 2), margin + 5, currentY);
        currentY += Math.min(evidenceLines.length, 2) * 4 + 2;
        if (finding.page_reference) {
          pdf.text(`(Page ${finding.page_reference})`, margin + 5, currentY);
          currentY += 5;
        }
      }

      // Recommended action
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      const actionLines = pdf.splitTextToSize(`Action: ${finding.recommended_action || 'No action specified'}`, contentWidth);
      pdf.text(actionLines.slice(0, 2), margin, currentY);
      currentY += Math.min(actionLines.length, 2) * 4 + 8;
    });
  });

  // ============================================
  // RECOMMENDED ACTIONS SUMMARY
  // ============================================
  pdf.addPage();
  currentY = margin;

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Recommended Actions', margin, currentY + 10);
  currentY += 25;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Prioritised remediation steps based on risk assessment:', margin, currentY);
  currentY += 12;

  // Sort findings by priority score
  const sortedFindings = [...(report.findings || [])]
    .filter(f => f.status !== 'pass')
    .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

  sortedFindings.slice(0, 15).forEach((finding, index) => {
    checkNewPage(15);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${index + 1}. ${finding.requirement_id}`, margin, currentY);

    pdf.setFont('helvetica', 'normal');
    const actionLines = pdf.splitTextToSize(finding.recommended_action || 'Review and address this gap', contentWidth - 10);
    pdf.text(actionLines.slice(0, 2), margin + 5, currentY + 5);
    currentY += 10 + Math.min(actionLines.length, 2) * 4;
  });

  // ============================================
  // CONCLUSION
  // ============================================
  pdf.addPage();
  currentY = margin;

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Conclusion', margin, currentY + 10);
  currentY += 25;

  const totalFindings = report.findings?.length || 0;
  const passCount = report.findings?.filter(f => f.status === 'pass').length || 0;
  const failCount = report.findings?.filter(f => f.status === 'fail').length || 0;
  const partialCount = report.findings?.filter(f => f.status === 'partial').length || 0;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');

  const conclusionText = [
    `This assessment evaluated ${report.company_name} against ${totalFindings} requirements of the ${frameworkName} framework.`,
    '',
    `Summary of Results:`,
    `- Requirements Met: ${passCount}`,
    `- Partial Compliance: ${partialCount}`,
    `- Non-Compliant: ${failCount}`,
    '',
    `Overall Compliance Score: ${report.overall_score}%`,
    '',
    report.overall_score >= 70
      ? 'The organisation demonstrates strong alignment with defence industry security requirements. Continue maintaining current security controls and address remaining gaps to achieve full compliance.'
      : report.overall_score >= 40
        ? 'The organisation shows partial alignment with security requirements. Prioritise addressing high-risk gaps identified in this report to improve compliance posture before engaging with defence contracts.'
        : 'Critical gaps exist in the organisation\'s security posture. Immediate action is required to address high-risk findings before pursuing DISP membership or defence supply chain participation.',
  ];

  conclusionText.forEach(line => {
    if (line === '') {
      currentY += 5;
    } else {
      const lines = pdf.splitTextToSize(line, contentWidth);
      pdf.text(lines, margin, currentY);
      currentY += lines.length * 5;
    }
  });

  // Next Steps
  currentY += 10;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Next Steps', margin, currentY);
  currentY += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const nextSteps = [
    '1. Review all high-risk findings and develop remediation timelines',
    '2. Assign responsibility for each gap to appropriate personnel',
    '3. Implement recommended actions in priority order',
    '4. Schedule follow-up assessment to validate remediation',
    '5. Contact Defence Industry Security for DISP application guidance',
  ];

  nextSteps.forEach(step => {
    pdf.text(step, margin, currentY);
    currentY += 6;
  });

  // ============================================
  // v2.0 DISCLAIMER SECTION
  // ============================================
  currentY += 15;
  checkNewPage(50);

  pdf.setFillColor(250, 250, 250);
  pdf.rect(margin, currentY, contentWidth, 40, 'F');
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(margin, currentY, contentWidth, 40, 'S');

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Important Disclaimer', margin + 5, currentY + 8);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  const disclaimerText = report.disclaimer ||
    'This assessment is AI-generated and should be verified by qualified security personnel. ' +
    'Evidence quotes and gap analyses are based on automated document analysis and may require ' +
    'manual verification. This report does not constitute legal advice or official DISP certification. ' +
    'Organisations should engage with Defence Industry Security for formal assessment and accreditation.';

  const disclaimerLines = pdf.splitTextToSize(disclaimerText, contentWidth - 10);
  pdf.text(disclaimerLines, margin + 5, currentY + 15);

  // v2.0 Assessment Delta (if available)
  if (report.assessment_delta && report.assessment_delta.trend !== 'first_assessment') {
    currentY += 50;
    checkNewPage(30);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Progress Since Last Assessment', margin, currentY);
    currentY += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const deltaInfo = [
      `Previous Score: ${report.assessment_delta.previous_score}%`,
      `Score Change: ${report.assessment_delta.score_change > 0 ? '+' : ''}${report.assessment_delta.score_change}%`,
      `Gaps Closed: ${report.assessment_delta.gaps_closed}`,
      `New Gaps: ${report.assessment_delta.new_gaps}`,
      `Trend: ${report.assessment_delta.trend.charAt(0).toUpperCase() + report.assessment_delta.trend.slice(1)}`,
    ];

    deltaInfo.forEach(line => {
      pdf.text(line, margin + 5, currentY);
      currentY += 5;
    });
  }

  // ============================================
  // ADD PAGE NUMBERS
  // ============================================
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(i, totalPages);
  }

  // ============================================
  // SAVE PDF
  // ============================================
  const fileName = `Clearance_${report.company_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Report'}_${
    report.framework || 'DISP'
  }_${new Date().toISOString().split('T')[0]}.pdf`;

  pdf.save(fileName);

  return fileName;
};

/**
 * Generate a Remediation Progress Report PDF from tracker data.
 */
export const generateTrackerPDF = async (gaps, filter = {}) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  const colors = {
    primary: [13, 148, 136],      // #0D9488 (teal)
    secondary: [22, 27, 34],
    text: [0, 0, 0],
    muted: [139, 148, 158],
    pass: [13, 148, 136],
    partial: [245, 158, 11],
    fail: [239, 68, 68],
    blue: [59, 130, 246],
  };

  let currentY = margin;

  const checkNewPage = (requiredHeight) => {
    if (currentY + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  // ============================================
  // COVER / HEADER
  // ============================================
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageWidth, 50, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Remediation Progress Report', margin, 30);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, 42);

  currentY = 65;

  // ============================================
  // SUMMARY STATS
  // ============================================
  const todoCount = gaps.todo?.length || 0;
  const inProgressCount = gaps.in_progress?.length || 0;
  const resolvedCount = gaps.resolved?.length || 0;
  const totalGaps = todoCount + inProgressCount + resolvedCount;

  pdf.setTextColor(...colors.text);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Summary', margin, currentY);
  currentY += 10;

  // Stats boxes
  const boxWidth = (contentWidth - 15) / 4;
  const stats = [
    { label: 'Total Gaps', value: totalGaps, color: colors.muted },
    { label: 'To Do', value: todoCount, color: colors.fail },
    { label: 'In Progress', value: inProgressCount, color: colors.partial },
    { label: 'Resolved', value: resolvedCount, color: colors.pass },
  ];

  stats.forEach((stat, index) => {
    const x = margin + (index * (boxWidth + 5));
    pdf.setFillColor(245, 245, 245);
    pdf.roundedRect(x, currentY, boxWidth, 25, 2, 2, 'F');

    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...stat.color);
    pdf.text(String(stat.value), x + boxWidth / 2, currentY + 12, { align: 'center' });

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...colors.muted);
    pdf.text(stat.label, x + boxWidth / 2, currentY + 20, { align: 'center' });
  });

  currentY += 35;

  // Progress bar
  const progressWidth = contentWidth;
  const progressHeight = 6;
  pdf.setFillColor(230, 230, 230);
  pdf.roundedRect(margin, currentY, progressWidth, progressHeight, 2, 2, 'F');

  let progressX = margin;
  if (resolvedCount > 0) {
    const resolvedWidth = (resolvedCount / totalGaps) * progressWidth;
    pdf.setFillColor(...colors.pass);
    pdf.roundedRect(progressX, currentY, resolvedWidth, progressHeight, 2, 2, 'F');
    progressX += resolvedWidth;
  }
  if (inProgressCount > 0) {
    const inProgressWidth = (inProgressCount / totalGaps) * progressWidth;
    pdf.setFillColor(...colors.partial);
    pdf.rect(progressX, currentY, inProgressWidth, progressHeight, 'F');
    progressX += inProgressWidth;
  }

  currentY += 20;

  // ============================================
  // GAPS BY STATUS
  // ============================================
  const columns = [
    { id: 'todo', title: 'To Do', color: colors.fail, data: gaps.todo || [] },
    { id: 'in_progress', title: 'In Progress', color: colors.partial, data: gaps.in_progress || [] },
    { id: 'resolved', title: 'Resolved', color: colors.pass, data: gaps.resolved || [] },
  ];

  columns.forEach(column => {
    if (column.data.length === 0) return;

    checkNewPage(30);

    // Column header
    pdf.setFillColor(...column.color);
    pdf.rect(margin, currentY, contentWidth, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${column.title} (${column.data.length})`, margin + 3, currentY + 5.5);
    currentY += 12;

    // Gap items
    column.data.forEach(gap => {
      checkNewPage(20);

      // Gap card
      pdf.setFillColor(250, 250, 250);
      pdf.roundedRect(margin, currentY, contentWidth, 18, 1, 1, 'F');
      pdf.setDrawColor(230, 230, 230);
      pdf.roundedRect(margin, currentY, contentWidth, 18, 1, 1, 'S');

      // Requirement ID
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...colors.primary);
      pdf.text(gap.requirement_id || 'N/A', margin + 3, currentY + 5);

      // Risk badge
      const riskColor = gap.risk_rating === 'high' ? colors.fail :
                        gap.risk_rating === 'medium' ? colors.partial : colors.pass;
      pdf.setFillColor(...riskColor);
      pdf.roundedRect(margin + 35, currentY + 1.5, 14, 5, 1, 1, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(6);
      pdf.text((gap.risk_rating || 'N/A').toUpperCase(), margin + 37, currentY + 5);

      // Company name
      pdf.setTextColor(...colors.muted);
      pdf.setFontSize(7);
      pdf.text(gap.company_name || '', margin + 55, currentY + 5);

      // Gap description
      pdf.setTextColor(...colors.text);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const descLines = pdf.splitTextToSize(gap.gap_description || 'No description', contentWidth - 6);
      pdf.text(descLines[0], margin + 3, currentY + 12);

      currentY += 22;
    });

    currentY += 5;
  });

  // ============================================
  // FOOTER
  // ============================================
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.muted);
    pdf.text(`Clearance - Remediation Progress Report | Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  // ============================================
  // SAVE
  // ============================================
  const fileName = `Clearance_Remediation_Progress_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);

  return fileName;
};

export default generatePDF;
