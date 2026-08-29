'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { apiGet } from '@/lib/api';
import SearchBar from '@/components/SearchBar';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/util/date';
import {
  IconUsers,
  IconBuilding,
  IconShield,
  IconArrowRight,
  IconSearch,
} from '@/components/ui/Icons';
import './admin-users.css';

interface PlatformUser {
  id: string;
  email: string;
  role: 'business' | 'contractor' | 'admin';
  created_at: string;
  business_company?: string;
  contractor_company?: string;
  verification_status?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 4,
    width: 0,
    opacity: 0,
  });
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const loadUsers = () => {
    setLoading(true);
    const search = new URLSearchParams();
    if (query) search.set('q', query);
    if (roleFilter) search.set('role', roleFilter);

    apiGet<{ data: PlatformUser[]; total: number }>(`/admin/users?${search.toString()}`)
      .then(({ data, total }) => {
        setUsers(data);
        setTotal(total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  useEffect(() => {
    const updateIndicator = () => {
      const activeKey = roleFilter || 'ALL';
      const activeEl = tabRefs.current[activeKey];
      if (activeEl) {
        setIndicatorStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1,
        });
      }
    };

    updateIndicator();
    const timeout = setTimeout(updateIndicator, 50);
    window.addEventListener('resize', updateIndicator);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [roleFilter, users]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return <span className="admin-role-badge admin-role-badge--admin">Admin</span>;
    }
    if (role === 'contractor') {
      return <span className="admin-role-badge admin-role-badge--contractor">Contractor</span>;
    }
    return <span className="admin-role-badge admin-role-badge--business">Manufacturer</span>;
  };

  return (
    <div className="admin-users-page">
      <WorkspacePageHeader
        title="User Management"
        subtitle={`Search and monitor all registered accounts (${total} platform users).`}
      />

      {/* Search & Sliding Role Tabs Toolbar */}
      <div className="admin-users-toolbar">
        <form onSubmit={handleSearchSubmit} className="admin-users-search-form">
          <SearchBar value={query} onChange={setQuery} placeholder="Search by email or company name..." />
          <button type="submit" className="admin-search-btn">
            Search
          </button>
        </form>

        <div className="admin-users-tabs">
          <div
            className="admin-users-sliding-indicator"
            style={{
              transform: `translateX(${indicatorStyle.left}px)`,
              width: `${indicatorStyle.width}px`,
              opacity: indicatorStyle.opacity,
            }}
          />
          <button
            type="button"
            ref={(el) => { tabRefs.current['ALL'] = el; }}
            className={`admin-user-tab-btn ${roleFilter === '' ? 'active' : ''}`}
            onClick={() => setRoleFilter('')}
          >
            All Roles
          </button>
          <button
            type="button"
            ref={(el) => { tabRefs.current['business'] = el; }}
            className={`admin-user-tab-btn ${roleFilter === 'business' ? 'active' : ''}`}
            onClick={() => setRoleFilter('business')}
          >
            Manufacturers
          </button>
          <button
            type="button"
            ref={(el) => { tabRefs.current['contractor'] = el; }}
            className={`admin-user-tab-btn ${roleFilter === 'contractor' ? 'active' : ''}`}
            onClick={() => setRoleFilter('contractor')}
          >
            Contractors
          </button>
          <button
            type="button"
            ref={(el) => { tabRefs.current['admin'] = el; }}
            className={`admin-user-tab-btn ${roleFilter === 'admin' ? 'active' : ''}`}
            onClick={() => setRoleFilter('admin')}
          >
            Admins
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading users…" />
      ) : users.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={32} />}
          title="No users found"
          subtitle="No registered accounts match your search query or role filter."
        />
      ) : (
        <div className="admin-users-table-card">
          <table className="admin-users-table">
            <colgroup>
              <col style={{ width: '28%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>User Email</th>
                <th>Role</th>
                <th>Company Name</th>
                <th>Joined Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="user-email-cell">
                      <div className="user-avatar">
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="user-email-text">{u.email}</span>
                    </div>
                  </td>
                  <td>{getRoleBadge(u.role)}</td>
                  <td>
                    <span className="user-company-text">
                      {u.business_company || u.contractor_company || '—'}
                    </span>
                  </td>
                  <td>
                    <span className="user-date-text">{formatDate(u.created_at)}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/admin/users/${u.id}`} className="admin-inspect-btn">
                      Inspect <IconArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
