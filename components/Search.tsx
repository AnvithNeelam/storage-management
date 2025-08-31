'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { getFiles } from '@/lib/actions/file.actions';
import { Models } from 'node-appwrite';
import Thumbnail from './Thumbnail';
import FormattedDateTime from './FormattedDateTime';
import { useDebounce } from 'use-debounce';

const Search = () => {
  const [query, setQuery] = useState('');
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('query') || '';
  const [results, setResults] = useState<Models.Document[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const [debouncedQuery] = useDebounce(query, 300);

  useEffect(() => {
    const fetchFiles = async () => {
      if (debouncedQuery.length === 0) {
        setResults([]);
        setOpen(false);
        return router.push(path.replace(searchParams.toString(), ""));
      }

      const files = await getFiles({ types: [], searchText: debouncedQuery });
      setResults(files.documents);
      setOpen(true);
    };

    fetchFiles();
  }, [debouncedQuery]);

  useEffect(() => {
    if (!searchQuery) {
      setQuery('');
    }
  }, [searchQuery]);

  const handleClickItem = (file: Models.Document) => {
    setOpen(false)
    setResults([])

    router.push(`/${(file.type === 'video' || file.type === 'audio') ? 'media' : file.type + 's'}?query=${query}`)
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="relative w-full">
        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm search-input-wrapper">
          <Image 
            src="/assets/icons/search.svg" 
            alt="search" 
            width={20} 
            height={20}
          />

          <Input 
            value={query} 
            placeholder="Search..." 
            className="flex-1 border-none focus:ring-0 search-input"
            onChange={(e) => setQuery(e.target.value)} 
          />
        </div>

        {open && (
          <ul className="absolute top-full left-0 right-0 mt-2 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-50 search-result">
            {results.length > 0 ? (
              results.map((file) => (
                <li 
                  key={file.$id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleClickItem(file)}
                >
                  {/* Left section (thumbnail + name) */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Thumbnail 
                      type={file.type}
                      extension={file.extension}
                      url={file.url}
                      className="size-9 min-w-9" 
                    />
                    <p className="subtitle-2 line-clamp-1 text-light-100 truncate">
                      {file.name}
                    </p>
                  </div>

                  {/* Right section (date, always at the end) */}
                  <FormattedDateTime 
                    date={file.$createdAt} 
                    className="caption text-light-200 ml-4 shrink-0" 
                  />
                </li>
              ))
            ) : (
              <p className="p-3 text-sm text-gray-500">No files found</p>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Search;
