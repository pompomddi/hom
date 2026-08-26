'use client';
// 구글시트 게시판 (API 자동 탭 감지 버전, v2) — "웹에 게시" 없이 평소 공유 설정 그대로 사용.
// 새 탭을 추가해도 코드를 안 건드려도 자동으로 목록에 나타남.
// 시트 첫 줄이 비어있어도(제목/디자인용 빈 줄) 안전하게 표시되도록 처리.
import { useEffect, useState } from 'react';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';

// ↓↓↓ 여기 두 개만 본인 값으로 채우면 돼 ↓↓↓
const SPREADSHEET_ID = '1tvE-5_TkOH32c5bgiHU-0clT3BWhH06qOwXUQSZwp7Y';
const API_KEY = 'AIzaSyCAV7nyEVsKKo_yOU7bzUJIBr-M6sC2_D4';

// 메뉴에 안 보이고 싶은 탭 이름이 있으면 여기 적어두면 목록에서 빠짐 (선택사항)
const HIDDEN_TABS: string[] = [];

type SheetTab = { title: string };

function isRowBlank(row: string[] | undefined): boolean {
  if (!row) return true;
  return row.every((c) => !c || c.trim() === '');
}

export default function SheetBoardPage() {
  const [tabs, setTabs] = useState<SheetTab[] | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [loadingTabs, setLoadingTabs] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1) 스프레드시트에 어떤 탭들이 있는지 먼저 가져오기
  const loadTabs = async () => {
    setLoadingTabs(true);
    setError(null);
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}&fields=sheets.properties.title`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('탭 목록 요청 실패');
      const data = await res.json();
      const list: SheetTab[] = (data.sheets ?? [])
        .map((s: { properties: { title: string } }) => ({ title: s.properties.title }))
        .filter((t: SheetTab) => !HIDDEN_TABS.includes(t.title));
      setTabs(list);
      if (list.length > 0) setActiveTab(list[0].title);
    } catch {
      setError('구글시트를 불러오지 못했어요. API 키와 공유 설정을 확인해주세요.');
      setTabs([]);
    } finally {
      setLoadingTabs(false);
    }
  };

  // 2) 선택된 탭의 실제 내용(값) 가져오기
  const loadRows = async (title: string) => {
    setLoadingRows(true);
    setError(null);
    setRows(null);
    try {
      const range = encodeURIComponent(`'${title}'`);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('내용 요청 실패');
      const data = await res.json();
      setRows(data.values ?? []);
    } catch {
      setError('이 탭 내용을 불러오지 못했어요.');
    } finally {
      setLoadingRows(false);
    }
  };

  useEffect(() => {
    loadTabs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab) loadRows(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 첫 줄이 비어있으면(제목용 빈 줄 등) 헤더로 쓰지 않고 그냥 전부 데이터 줄로 취급
  const firstRowBlank = isRowBlank(rows?.[0]);
  const header = !firstRowBlank ? rows?.[0] ?? [] : [];
  const body = !firstRowBlank ? rows?.slice(1) ?? [] : rows ?? [];
  const loading = loadingTabs || loadingRows;
  const hasAnyContent = body.some((r) => !isRowBlank(r)) || header.length > 0;

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle>SHEET</PageTitle>
        <EditableDesc k="sheet-desc" def="구글 시트에서 불러온 자료" />
      </div>

      {!loadingTabs && tabs && tabs.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {tabs.map((tab) => (
            <button
              key={tab.title}
              className={tab.title === activeTab ? 'btn btn-dark' : 'btn btn-ghost'}
              style={tab.title !== activeTab ? { background: 'rgba(255,255,255,.9)' } : undefined}
              onClick={() => setActiveTab(tab.title)}
            >
              {tab.title}
            </button>
          ))}
          <button
            className="btn btn-ghost"
            style={{ background: 'rgba(255,255,255,.9)', marginLeft: 'auto' }}
            onClick={() => {
              loadTabs();
              if (activeTab) loadRows(activeTab);
            }}
          >
            ↻ 새로고침
          </button>
        </div>
      )}

      <div className="panel" style={{ padding: 0, overflowX: 'auto' }}>
        {loading && (
          <div style={{ padding: 44, textAlign: 'center', fontSize: 13, color: 'var(--faint)' }}>불러오는 중...</div>
        )}
        {!loading && error && (
          <div style={{ padding: 44, textAlign: 'center', fontSize: 13, color: 'var(--faint)' }}>{error}</div>
        )}
        {!loading && !error && tabs && tabs.length === 0 && (
          <div style={{ padding: 44, textAlign: 'center', fontSize: 13, color: 'var(--faint)' }}>
            표시할 탭이 없습니다
          </div>
        )}
        {!loading && !error && !hasAnyContent && (
          <div style={{ padding: 44, textAlign: 'center', fontSize: 13, color: 'var(--faint)' }}>내용이 없습니다</div>
        )}
        {!loading && !error && hasAnyContent && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            {header.length > 0 && (
              <thead>
                <tr>
                  {header.map((h, i) => (
                    <th
                      key={i}
                      style={{
                        textAlign: 'left',
                        padding: '10px 14px',
                        borderBottom: '1px solid rgba(0,0,0,.12)',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 1 ? 'rgba(0,0,0,.02)' : undefined }}>
                  {r.map((cell, ci) => (
                    <td key={ci} style={{ padding: '9px 14px', borderBottom: '1px solid rgba(0,0,0,.05)' }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
