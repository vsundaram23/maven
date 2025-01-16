import React from 'react';
import './SearchBar.css';

const SearchBar = () => {
  return (
    <div className="search-container">
      <div className="search-wrapper">
        <input 
          type="text" 
          placeholder="Find trusted service providers..."
          className="search-input"
        />
        <select className="category-select">
          <option value="">All Categories</option>
          <option value="plumbing">Plumbing</option>
          <option value="electrical">Electrical</option>
          <option value="cleaning">Cleaning</option>
        </select>
        <button className="search-button">Search</button>
      </div>
    </div>
  );
};

export default SearchBar;
